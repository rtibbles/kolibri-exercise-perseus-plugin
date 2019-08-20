.PHONY: help clean clean-pyc release dist

help:
	@echo "clean-build - remove build artifacts"
	@echo "clean-pyc - remove Python file artifacts"
	@echo "release - package and upload a release"
	@echo "dist - package"

clean: clean-build clean-pyc

clean-build:
	rm -fr build/
	rm -fr dist/
	rm -fr dist-packages-cache/
	rm -fr dist-packages-temp/
	rm -fr *.egg-info
	rm -fr .eggs
	rm -fr .cache

clean-pyc:
	find . -name '*.pyc' -exec rm -f {} +
	find . -name '*.pyo' -exec rm -f {} +
	find . -name '*~' -exec rm -f {} +

update-perseus:
	# update the constants.js to store the mathjax config file name.
	# Ben: This seems like it doesn't detect the file name?
	# This doesn't work, but until we have to update perseus, this should
    # is not important
	> kolibri_exercise_perseus_plugin/assets/src/constants.js
	config_file_name="$(basename kolibri_exercise_perseus_plugin/static/mathjax/2.1/config/*)"
	file_content="const ConfigFileName = '${config_file_name}'; module.exports = { ConfigFileName };"
	echo "${file_content}" >> kolibri_exercise_perseus_plugin/assets/src/constants.js
	yarn run extract-messages

dev:
	yarn run dev

assets:
	# move mathjax to static folder for our hacky loading
	rm -r kolibri_exercise_perseus_plugin/static
	mkdir kolibri_exercise_perseus_plugin/static
	cp -r node_modules/perseus/lib/mathjax kolibri_exercise_perseus_plugin/static/
	mkdir kolibri_exercise_perseus_plugin/static/images
	cp node_modules/perseus/images/spinner.gif kolibri_exercise_perseus_plugin/static/images
	cp -r node_modules/perseus/lib/mathquill/fonts kolibri_exercise_perseus_plugin/static/

	yarn run clean && yarn run build

check-build:
	[ -e kolibri_exercise_perseus_plugin/static/images/spinner.gif ] || ( echo "Please run: make assets" && exit 1 )

dist: clean assets check-build
	python setup.py bdist_wheel --universal

release:
	@ls -l dist/ || (echo "Nothing built, no dist/ so nothing to release" && exit 1)
	@echo "Documentation: See README.rst"
	@echo ""
	@echo ""
	@echo "Quick check list:"
	@echo ""
	@echo "1. Committed CrowdIn translations to repo?"
	@echo "2. Your git repo has no local changes?"
	@echo "3. Ensure that you have built the frontend files using Kolibri"
	@echo "4. Version info bumped in __init__.py"
	@echo "5. Ran 'make assets' to build everything"
	@echo "6. Running 'make dist' to generate a wheel file"
	@echo ""
	@echo "Do you want to upload everything in dist/*?"
	@echo ""
	@echo "CTRL+C to exit. ENTER to continue."
	@read __
	twine upload -s dist/*
