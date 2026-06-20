Getting Started with the Widget Library
=======================================

.. note::
   This documentation targets version 2.0 and later.

Introduction
------------

The Widget Library provides a set of reusable UI components for Python
applications. It supports both **synchronous** and *asynchronous* rendering
pipelines.

Installation
~~~~~~~~~~~~

Install using pip::

    pip install widget-library

Or with extra dependencies:

.. code-block:: bash

   pip install "widget-library[async,dev]"

Usage
-----

Basic Example
~~~~~~~~~~~~~

Here is a minimal working example:

.. code-block:: python

   from widgets import App, Button

   app = App(title="My App")
   btn = Button(label="Click me", on_click=lambda: print("clicked"))
   app.add(btn)
   app.run()

Configuration
~~~~~~~~~~~~~

The library reads configuration from ``~/.widgetrc`` by default.

.. list-table:: Configuration keys
   :header-rows: 1

   * - Key
     - Default
     - Description
   * - ``theme``
     - ``light``
     - UI colour theme
   * - ``scale``
     - ``1.0``
     - DPI scale factor

API Reference
-------------

.. automodule:: widgets.core
   :members:

.. warning::
   The ``LegacyRenderer`` class is deprecated and will be removed in v3.0.

See Also
--------

- :doc:`advanced`
- :doc:`changelog`
- `GitHub repository <https://github.com/example/widget-library>`_
