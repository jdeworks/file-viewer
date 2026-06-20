! sample.f90 — demonstration Fortran 90 module and program
! Uses free-form source format, modules, subroutines, and functions.

MODULE math_utils
  IMPLICIT NONE

  REAL, PARAMETER :: PI = 3.14159265358979
  REAL, PARAMETER :: E  = 2.71828182845905
  INTEGER, PARAMETER :: MAX_ITER = 1000

  INTERFACE dot_product_custom
    MODULE PROCEDURE dot_real, dot_double
  END INTERFACE

CONTAINS

  PURE FUNCTION dot_real(a, b) RESULT(res)
    REAL, INTENT(IN) :: a(:), b(:)
    REAL :: res
    INTEGER :: i
    res = 0.0
    DO i = 1, SIZE(a)
      res = res + a(i) * b(i)
    END DO
  END FUNCTION dot_real

  PURE FUNCTION dot_double(a, b) RESULT(res)
    DOUBLE PRECISION, INTENT(IN) :: a(:), b(:)
    DOUBLE PRECISION :: res
    INTEGER :: i
    res = 0.0D0
    DO i = 1, SIZE(a)
      res = res + a(i) * b(i)
    END DO
  END FUNCTION dot_double

  RECURSIVE FUNCTION factorial(n) RESULT(res)
    INTEGER, INTENT(IN) :: n
    INTEGER :: res
    IF (n <= 1) THEN
      res = 1
    ELSE
      res = n * factorial(n - 1)
    END IF
  END FUNCTION factorial

  SUBROUTINE normalize(vec, norm_vec)
    REAL, INTENT(IN)  :: vec(:)
    REAL, INTENT(OUT) :: norm_vec(:)
    REAL :: magnitude
    INTEGER :: i
    magnitude = SQRT(SUM(vec**2))
    IF (magnitude > 0.0) THEN
      DO i = 1, SIZE(vec)
        norm_vec(i) = vec(i) / magnitude
      END DO
    ELSE
      norm_vec = 0.0
    END IF
  END SUBROUTINE normalize

  SUBROUTINE matrix_multiply(a, b, c, m, n, k)
    INTEGER, INTENT(IN) :: m, n, k
    REAL, INTENT(IN)  :: a(m,n), b(n,k)
    REAL, INTENT(OUT) :: c(m,k)
    INTEGER :: i, j, l
    c = 0.0
    DO i = 1, m
      DO j = 1, k
        DO l = 1, n
          c(i,j) = c(i,j) + a(i,l) * b(l,j)
        END DO
      END DO
    END DO
  END SUBROUTINE matrix_multiply

END MODULE math_utils


MODULE io_utils
  USE math_utils
  IMPLICIT NONE

CONTAINS

  SUBROUTINE print_vector(label, vec)
    CHARACTER(LEN=*), INTENT(IN) :: label
    REAL, INTENT(IN) :: vec(:)
    INTEGER :: i
    WRITE(*,'(A,": [")') TRIM(label)
    DO i = 1, SIZE(vec)
      IF (i < SIZE(vec)) THEN
        WRITE(*,'(F8.4,", ")',ADVANCE='NO') vec(i)
      ELSE
        WRITE(*,'(F8.4,"]")') vec(i)
      END IF
    END DO
  END SUBROUTINE print_vector

  SUBROUTINE read_matrix(filename, mat, rows, cols)
    CHARACTER(LEN=*), INTENT(IN) :: filename
    INTEGER, INTENT(IN)  :: rows, cols
    REAL, INTENT(OUT) :: mat(rows, cols)
    INTEGER :: unit_num, i, j, ios
    unit_num = 10
    OPEN(UNIT=unit_num, FILE=filename, STATUS='OLD', IOSTAT=ios)
    IF (ios /= 0) THEN
      WRITE(*,*) 'Error opening file: ', TRIM(filename)
      RETURN
    END IF
    DO i = 1, rows
      READ(unit_num, *, IOSTAT=ios) (mat(i,j), j=1,cols)
    END DO
    CLOSE(unit_num)
  END SUBROUTINE read_matrix

END MODULE io_utils


PROGRAM sample_program
  USE math_utils
  USE iso_fortran_env, ONLY: REAL64, INT32

  IMPLICIT NONE

  REAL :: v1(3), v2(3), v_norm(3)
  REAL :: dot
  INTEGER :: n, i

  ! Initialize vectors
  v1 = [1.0, 2.0, 3.0]
  v2 = [4.0, 5.0, 6.0]

  ! Dot product
  dot = dot_real(v1, v2)
  WRITE(*,'("Dot product: ",F10.4)') dot

  ! Normalize
  CALL normalize(v1, v_norm)
  WRITE(*,'("Normalized v1: ",3F8.4)') v_norm

  ! Factorial
  DO n = 1, 10
    WRITE(*,'("factorial(",I2,") = ",I10)') n, factorial(n)
  END DO

END PROGRAM sample_program
