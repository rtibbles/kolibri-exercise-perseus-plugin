
Kolibri Exercise Renderer for Perseus
=====================================

What is Kolibri?
----------------

Kolibri is a Learning Management System / Learning App designed to run on low-power devices, targeting the needs of
learners and teachers in contexts with limited infrastructure. A user can install Kolibri and serve the app on a local
network, without an internet connection. Kolibri installations can be linked to one another, so that user data and
content can be shared. Users can create content for Kolibri and share it when there is network access to another
Kolibri installation or the internet.

See https://learningequality.org/kolibri/ for more info.

What is Perseus?
----------------

Khan Academy's exercise question editor and renderer.

See https://github.com/Khan/perseus for more info.

What is this plugin?
--------------------

A Perseus renderer wrapper for Kolibri that can track learning progress and save to the database.

How can I install this plugin?
------------------------------

1. Download this repo.
2. Terminal move to the repo dir and run `git submodule update —init —recursive`
2. Terminal move to your Kolibri dir
3. run the following command line:
    `pip install -e <KOLIBRI-PERSEUS-PLUGIN-LOCAL-PATH>`
    `python setup.py sdist`
    `kolibri plugin exercise_perseus_render enable`
    `npm install`


How can I contribute?
---------------------

 * `Documentation <http://kolibri.readthedocs.org/en/latest/>`_ is available online, and in the ``docs/`` directory.
 * Mailing list: `Google groups <https://groups.google.com/a/learningequality.org/forum/#!forum/dev>`_.
 * IRC: #kolibri on Freenode
