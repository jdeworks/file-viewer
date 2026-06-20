%{
/* A simple Lex/Flex lexer for a mini calculator */
#include <stdio.h>
#include "y.tab.h"
%}

DIGIT    [0-9]
ALPHA    [a-zA-Z]
ID       {ALPHA}({ALPHA}|{DIGIT})*

%%

{DIGIT}+    { yylval.ival = atoi(yytext); return NUMBER; }
"+"         { return PLUS; }
"-"         { return MINUS; }
"*"         { return TIMES; }
"/"         { return DIVIDE; }
"("         { return LPAREN; }
")"         { return RPAREN; }
"="         { return EQUALS; }
{ID}        { yylval.sval = strdup(yytext); return IDENT; }
[ \t]       { /* skip whitespace */ }
"\n"        { return NEWLINE; }
.           { fprintf(stderr, "Unknown char: %s\n", yytext); }

%%

int yywrap() { return 1; }
