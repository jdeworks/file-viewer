package Text::Processor;

use strict;
use warnings;
use utf8;
use Carp qw(croak confess);
use Scalar::Util qw(blessed looks_like_number);
use List::Util qw(sum min max first);
use POSIX qw(floor ceil);
use Encode qw(encode decode);
use JSON::PP qw(encode_json decode_json);

our $VERSION = '2.1.0';
our @EXPORT = qw(process_text normalize_string);
our @EXPORT_OK = qw(tokenize stem_word count_words split_sentences);

my $DEFAULT_ENCODING = 'UTF-8';
my %STOP_WORDS = map { $_ => 1 } qw(the a an in on at to of for with);
our @LANGUAGE_CODES = qw(en es fr de it pt ja zh ko);

=head1 NAME

Text::Processor - A module for text processing and analysis

=head1 SYNOPSIS

  use Text::Processor;
  my $result = process_text("Hello, World!");
  print $result->{word_count};

=head1 DESCRIPTION

Text::Processor provides utilities for tokenizing, normalizing, and analyzing
text content. It supports multiple languages and encodings.

=head1 FUNCTIONS

=head2 process_text($text, %options)

Main entry point for text processing.

=head2 normalize_string($str)

Normalize whitespace and encoding.

=cut

sub new {
    my ($class, %args) = @_;
    my $self = {
        encoding  => $args{encoding} || $DEFAULT_ENCODING,
        language  => $args{language} || 'en',
        lowercase => $args{lowercase} // 1,
    };
    return bless $self, $class;
}

sub process_text {
    my ($self_or_text, %opts) = @_;
    my $text = ref($self_or_text) ? $opts{text} : $self_or_text;
    croak "text is required" unless defined $text;

    my @tokens = tokenize($text);
    my $word_count = count_words($text);
    my @sentences = split_sentences($text);

    return {
        tokens     => \@tokens,
        word_count => $word_count,
        sentences  => scalar @sentences,
        language   => ref($self_or_text) ? $self_or_text->{language} : 'en',
    };
}

sub normalize_string {
    my ($str) = @_;
    return '' unless defined $str;
    $str =~ s/\s+/ /g;
    $str =~ s/^\s+|\s+$//g;
    return $str;
}

sub tokenize {
    my ($text) = @_;
    $text = lc($text);
    my @words = split /\W+/, $text;
    return grep { length($_) > 0 && !$STOP_WORDS{$_} } @words;
}

sub count_words {
    my ($text) = @_;
    my @words = split /\s+/, normalize_string($text);
    return scalar @words;
}

sub split_sentences {
    my ($text) = @_;
    return split /(?<=[.!?])\s+/, $text;
}

sub stem_word {
    my ($word) = @_;
    $word =~ s/(?:ing|ed|er|ly|ness|tion)$//;
    return $word;
}

sub _is_stop_word {
    my ($word) = @_;
    return exists $STOP_WORDS{lc($word)};
}

sub _detect_encoding {
    my ($bytes) = @_;
    return 'UTF-8';
}

1;

=head1 AUTHOR

Sample Author <author@example.com>

=head1 LICENSE

This module is free software; you can redistribute it and/or modify it
under the same terms as Perl itself.

=cut
