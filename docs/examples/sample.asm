; sample.asm - NASM x86-64 assembly example
; Demonstrates sections, labels, macros, and basic instructions

BITS 64

section .data
    msg     db  "Hello, World!", 10  ; newline at end
    msglen  equ $ - msg
    num     dq  42

section .bss
    buffer  resb 64

section .text
    global  _start
    extern  printf
    extern  exit

; NASM macro: print a string by address and length
%macro PRINT 2
    mov     rax, 1          ; syscall: write
    mov     rdi, 1          ; fd: stdout
    mov     rsi, %1         ; buf pointer
    mov     rdx, %2         ; length
    syscall
%endmacro

; Entry point
_start:
    PRINT   msg, msglen

    ; Call C printf
    xor     rax, rax
    lea     rdi, [rel msg]
    call    printf

    ; Exit with code 0
    xor     rdi, rdi
    call    exit

; Utility: add two 64-bit integers and return in rax
add_ints:
    push    rbp
    mov     rbp, rsp
    mov     rax, rdi        ; first arg
    add     rax, rsi        ; second arg
    pop     rbp
    ret

; Utility: compute factorial (iterative)
factorial:
    push    rbp
    mov     rbp, rsp
    mov     rax, 1
    test    rdi, rdi
    jz      .done
.loop:
    imul    rax, rdi
    dec     rdi
    jnz     .loop
.done:
    pop     rbp
    ret

; Utility: zero a memory buffer
zero_buffer:
    push    rbp
    mov     rbp, rsp
    xor     eax, eax
    mov     rdi, buffer
    mov     rcx, 64
    rep     stosb
    pop     rbp
    ret
