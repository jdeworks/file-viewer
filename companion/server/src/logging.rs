// Lightweight structured logging for the companion: every meaningful action (connect, save,
// delete, watched-path change, file-change events, errors) is recorded with a UTC timestamp and a
// level. Logs go three places:
//   1. stdout — so running the bare `companion.exe`/server shows live activity (no --debug needed).
//   2. a daily file — `<config dir>/file-viewer-companion/logs/companion-YYYY-MM-DD.log` — one file
//      per day for trivial cleanup; files older than RETAIN_DAYS are pruned on init.
//   3. an in-memory ring buffer — so GET /logs can serve + filter recent entries for the viewers
//      (browser settings panel + tray) without re-reading files.
use serde::Serialize;
use std::collections::VecDeque;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use time::{format_description::well_known::Rfc3339, Date, OffsetDateTime};

const RING_CAP: usize = 2000;
const RETAIN_DAYS: i64 = 7;

#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Level {
    Info,
    Warn,
    Error,
}

impl Level {
    fn as_str(self) -> &'static str {
        match self {
            Level::Info => "info",
            Level::Warn => "warn",
            Level::Error => "error",
        }
    }
    /// Parse a min-level filter ("info" includes warn+error, "warn" includes error, …).
    pub fn from_filter(s: &str) -> Option<Level> {
        match s.to_ascii_lowercase().as_str() {
            "info" => Some(Level::Info),
            "warn" | "warning" => Some(Level::Warn),
            "error" | "err" => Some(Level::Error),
            _ => None,
        }
    }
}

#[derive(Clone, Serialize)]
pub struct LogEntry {
    /// RFC3339 UTC timestamp, e.g. "2026-06-23T08:30:00Z".
    pub ts: String,
    pub level: String,
    pub msg: String,
}

struct Logger {
    ring: Mutex<VecDeque<LogEntry>>,
    dir: Option<PathBuf>,
}

static LOGGER: OnceLock<Logger> = OnceLock::new();

/// Initialise logging with the directory that holds `config.json`. Logs are written under a `logs/`
/// subdir there. Safe to call once; subsequent calls are ignored. Passing `None` keeps stdout +
/// ring-buffer logging but writes no files (used by tests / when the config dir is unknown).
pub fn init(config_path: Option<PathBuf>) {
    let dir = config_path.and_then(|p| p.parent().map(|parent| parent.join("logs")));
    if let Some(d) = &dir {
        let _ = std::fs::create_dir_all(d);
        prune_old(d);
    }
    let _ = LOGGER.set(Logger {
        ring: Mutex::new(VecDeque::with_capacity(RING_CAP)),
        dir,
    });
}

fn prune_old(dir: &std::path::Path) {
    let today = OffsetDateTime::now_utc().date();
    let Ok(rd) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in rd.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        // companion-YYYY-MM-DD.log
        let Some(date_str) = name
            .strip_prefix("companion-")
            .and_then(|s| s.strip_suffix(".log"))
        else {
            continue;
        };
        if let Ok(d) = Date::parse(
            date_str,
            time::macros::format_description!("[year]-[month]-[day]"),
        ) {
            if (today - d).whole_days() > RETAIN_DAYS {
                let _ = std::fs::remove_file(entry.path());
            }
        }
    }
}

pub fn log(level: Level, msg: impl Into<String>) {
    let now = OffsetDateTime::now_utc();
    let ts = now.format(&Rfc3339).unwrap_or_default();
    let msg = msg.into();
    let entry = LogEntry {
        ts: ts.clone(),
        level: level.as_str().to_string(),
        msg: msg.clone(),
    };

    // 1. stdout — always visible.
    println!("{ts} {:>5} {msg}", level.as_str().to_uppercase());

    let Some(logger) = LOGGER.get() else { return };

    // 2. daily file.
    if let Some(dir) = &logger.dir {
        let date = now
            .format(time::macros::format_description!("[year]-[month]-[day]"))
            .unwrap_or_default();
        let file = dir.join(format!("companion-{date}.log"));
        if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&file) {
            let _ = writeln!(f, "{ts} {} {msg}", level.as_str().to_uppercase());
        }
    }

    // 3. ring buffer.
    if let Ok(mut ring) = logger.ring.lock() {
        if ring.len() == RING_CAP {
            ring.pop_front();
        }
        ring.push_back(entry);
    }
}

pub fn info(msg: impl Into<String>) {
    log(Level::Info, msg);
}
pub fn warn(msg: impl Into<String>) {
    log(Level::Warn, msg);
}
pub fn error(msg: impl Into<String>) {
    log(Level::Error, msg);
}

/// Recent log entries (newest last), filtered by minimum level, case-insensitive substring, and an
/// RFC3339 `since` cutoff. `limit` caps the returned count (most recent kept).
pub fn recent(min_level: Option<Level>, contains: Option<&str>, since: Option<&str>, limit: usize) -> Vec<LogEntry> {
    let Some(logger) = LOGGER.get() else {
        return vec![];
    };
    let Ok(ring) = logger.ring.lock() else {
        return vec![];
    };
    let needle = contains.map(|c| c.to_ascii_lowercase());
    let mut out: Vec<LogEntry> = ring
        .iter()
        .filter(|e| match min_level {
            Some(min) => Level::from_filter(&e.level).map(|l| l >= min).unwrap_or(true),
            None => true,
        })
        .filter(|e| match &needle {
            Some(n) => e.msg.to_ascii_lowercase().contains(n),
            None => true,
        })
        .filter(|e| match since {
            Some(s) => e.ts.as_str() >= s, // RFC3339 sorts lexicographically by time
            None => true,
        })
        .cloned()
        .collect();
    if out.len() > limit {
        out = out.split_off(out.len() - limit);
    }
    out
}
