dnl Sample M4 macro file — Autoconf-style build configuration
AC_PREREQ([2.69])
AC_INIT([myproject], [1.0.0], [bugs@example.com])
AM_INIT_AUTOMAKE([-Wall -Werror foreign])

dnl Check for required programs
AC_PROG_CC
AC_PROG_INSTALL
AC_PROG_MAKE_SET

dnl Check for headers
AC_CHECK_HEADERS([stdio.h stdlib.h string.h])

dnl Define a custom macro
m4_define([MY_VERSION], [1.0.0])
m4_define([MY_DESCRIPTION], [A sample M4/Autoconf project])

dnl Check for optional library
AC_CHECK_LIB([m], [sqrt])

dnl Set output variables
AC_SUBST([MYPROJECT_VERSION], [MY_VERSION])

dnl Output files
AC_CONFIG_FILES([Makefile src/Makefile])
AC_OUTPUT

dnl Print summary
AC_MSG_NOTICE([Configuration summary:
  Version: MY_VERSION
  Prefix:  ${prefix}
])
