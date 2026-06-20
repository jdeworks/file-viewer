;;; sample.lisp — Common Lisp demo

(defpackage :demo
  (:use :cl)
  (:export #:hello #:person #:greet))

(in-package :demo)

(defvar *greeting* "Hello"
  "The default greeting string.")

(defparameter *max-retries* 3
  "Maximum number of retry attempts.")

(defconstant +version+ "1.0.0"
  "Library version.")

(defclass person ()
  ((name :initarg :name :accessor person-name :type string)
   (age  :initarg :age  :accessor person-age  :type integer))
  (:documentation "Represents a person with a name and age."))

(defclass employee (person)
  ((department :initarg :department :accessor employee-department :type string))
  (:documentation "An employee, which is a person with a department."))

(defun hello (name)
  "Return a greeting string for NAME."
  (format nil "~a, ~a!" *greeting* name))

(defun greet (person)
  "Print a greeting for PERSON."
  (format t "~a~%" (hello (person-name person))))

(defun make-person (name age)
  "Construct and return a new PERSON instance."
  (make-instance 'person :name name :age age))

(defun adult-p (person)
  "Return T if PERSON is 18 or older."
  (>= (person-age person) 18))

(require :alexandria)
(require :cl-ppcre)
