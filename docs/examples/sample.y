%{
/* sample.y — Simple expression parser (Yacc/Bison grammar) */
#include <stdio.h>
#include <stdlib.h>
#include <math.h>

extern int yylex(void);
extern int yylineno;
void yyerror(const char *msg);
%}

%union {
    double  dval;
    char   *sval;
    int     ival;
}

%token <dval>  NUMBER
%token <sval>  IDENTIFIER STRING_LIT
%token <ival>  INTEGER

%token PLUS MINUS TIMES DIVIDE POWER MOD
%token LPAREN RPAREN LBRACE RBRACE LBRACKET RBRACKET
%token ASSIGN EQ NE LT GT LE GE
%token AND OR NOT
%token IF ELSE WHILE FOR RETURN
%token NEWLINE EOF_TOK

%type <dval> expr term factor primary
%type <sval> identifier
%type <ival> stmt stmt_list

%left  OR
%left  AND
%right NOT
%left  EQ NE
%left  LT GT LE GE
%left  PLUS MINUS
%left  TIMES DIVIDE MOD
%right POWER
%right UMINUS

%start program

%%

program
    : stmt_list EOF_TOK          { printf("Parsed OK\n"); }
    | /* empty */
    ;

stmt_list
    : stmt                       { $$ = 1; }
    | stmt_list stmt             { $$ = $1 + 1; }
    ;

stmt
    : expr NEWLINE               { printf("= %g\n", $1); }
    | identifier ASSIGN expr NEWLINE
                                 { printf("assign %s = %g\n", $1, $3); }
    | IF LPAREN expr RPAREN LBRACE stmt_list RBRACE
                                 { /* if block */ }
    | WHILE LPAREN expr RPAREN LBRACE stmt_list RBRACE
                                 { /* while block */ }
    | RETURN expr NEWLINE        { printf("return %g\n", $2); }
    | NEWLINE                    { /* blank line */ }
    ;

expr
    : expr PLUS term             { $$ = $1 + $3; }
    | expr MINUS term            { $$ = $1 - $3; }
    | term                       { $$ = $1; }
    ;

term
    : term TIMES factor          { $$ = $1 * $3; }
    | term DIVIDE factor         {
        if ($3 == 0.0) { yyerror("division by zero"); }
        $$ = $1 / $3;
    }
    | term MOD factor            { $$ = fmod($1, $3); }
    | factor                     { $$ = $1; }
    ;

factor
    : primary POWER factor       { $$ = pow($1, $3); }
    | primary                    { $$ = $1; }
    ;

primary
    : NUMBER                     { $$ = $1; }
    | MINUS primary %prec UMINUS { $$ = -$2; }
    | LPAREN expr RPAREN         { $$ = $2; }
    | identifier                 { $$ = 0.0; /* lookup */ }
    ;

identifier
    : IDENTIFIER                 { $$ = $1; }
    ;

%%

void yyerror(const char *msg) {
    fprintf(stderr, "Parse error at line %d: %s\n", yylineno, msg);
}

int main(void) {
    return yyparse();
}
