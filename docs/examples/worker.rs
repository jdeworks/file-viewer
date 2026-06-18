use std::collections::BTreeMap;

fn count_words(text: &str) -> BTreeMap<String, usize> {
    let mut counts = BTreeMap::new();
    for word in text.split_whitespace() {
        let clean = word.trim_matches(|c: char| !c.is_alphanumeric()).to_lowercase();
        if !clean.is_empty() {
            *counts.entry(clean).or_insert(0) += 1;
        }
    }
    counts
}

fn main() {
    let counts = count_words("File viewer renders files, folders, and files again.");
    println!("{counts:#?}");
}
