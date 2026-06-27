// Depth test for the Perl known view: the parser must recover REAL structure — subroutine param
// names (from the `my (...) = @_` idiom AND signatures), packages, and use/require imports — not
// just names. Pure (analyzePerl is DOM-free). No Perl sample exists under docs/examples, so this
// uses an inline fixture (mirrors the absolute-path readFileSync pattern of known-ada-lang.test.mjs
// for when a real sample.pl is added).
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzePerl } from '../docs/types/text/known/perl-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const samplePath = resolve(HERE, '../docs/examples/sample.pl');

const FIXTURE = `#!/usr/bin/perl
use strict;
use warnings;
use My::Helper qw(thing);
require Carp;

=pod

=head1 NAME

My::Mod - a demo module

=cut

package My::Mod;

our $VERSION = '1.2';
my $threshold = 5;

sub add {
    my ($a, $b) = @_;
    return $a + $b;
}

sub greet {
    my $name = shift;
    my $greeting = shift;
    return "$greeting, $name";
}

sub typed ($x, $y) {
    return $x * $y;
}

1;
`;

const source = existsSync(samplePath) ? readFileSync(samplePath, 'utf8') : FIXTURE;
const usedReal = existsSync(samplePath);
console.log(usedReal ? `(using real sample: ${samplePath})` : '(using inline fixture; no docs/examples Perl sample)');

const { packages, uses, subs, variables, hasPod } = analyzePerl(source);

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const sub = (n) => subs.find((s) => s.name === n);

ok(packages.includes('My::Mod'), 'package My::Mod captured');
ok(uses.some((u) => u.kind === 'use' && u.name === 'strict'), 'use strict import');
ok(uses.some((u) => u.name === 'My::Helper'), 'use My::Helper import');
ok(uses.some((u) => u.kind === 'require' && u.name === 'Carp'), 'require Carp import');

// param recovery from `my ($a, $b) = @_;`
const add = sub('add');
ok(add && add.params.length === 2 && add.params[0] === '$a' && add.params[1] === '$b',
  'sub add params recovered from my (...) = @_  ->  $a, $b');

// param recovery from a run of `my $x = shift;`
const greet = sub('greet');
ok(greet && greet.params.length === 2 && greet.params[0] === '$name' && greet.params[1] === '$greeting',
  'sub greet params recovered from shift idiom  ->  $name, $greeting');

// param recovery from a real signature
const typed = sub('typed');
ok(typed && typed.params.length === 2 && typed.params[0] === '$x' && typed.params[1] === '$y',
  'sub typed params from signature  ->  $x, $y');

ok([...subs].some((s) => s.params.length), 'at least one sub carries recovered params (not name-only)');
ok(variables.some((v) => v.name === '$VERSION' && v.kind === 'our'), 'our $VERSION variable');
ok(variables.some((v) => v.name === '$threshold' && v.kind === 'my'), 'my $threshold variable');
ok(hasPod === true, 'POD presence detected');
ok(subs.every((s) => s.package === 'My::Mod'), 'subs attributed to package My::Mod');

console.log(failed ? `\n${failed} failed` : '\nall perl-lang assertions passed');
process.exit(failed ? 1 : 0);
