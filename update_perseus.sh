# move mathjax to static folder for our hacky loading.
rm -r kolibri_exercise_perseus_plugin/static
mkdir kolibri_exercise_perseus_plugin/static
cp -r kolibri_exercise_perseus_plugin/node_modules/perseus/lib/mathjax kolibri_exercise_perseus_plugin/static/
mkdir kolibri_exercise_perseus_plugin/static/images
cp kolibri_exercise_perseus_plugin/node_modules/perseus/images/throbber.gif kolibri_exercise_perseus_plugin/static/images
cp -r kolibri_exercise_perseus_plugin/node_modules/perseus/lib/mathquill/fonts kolibri_exercise_perseus_plugin/static/

# update the constants.js to store the mathjax config file name.
> kolibri_exercise_perseus_plugin/assets/src/constants.js
config_file_name="$(basename kolibri_exercise_perseus_plugin/static/mathjax/2.1/config/*)"
file_content="const ConfigFileName = '${config_file_name}';
module.exports = { ConfigFileName };"
echo "${file_content}" >> kolibri_exercise_perseus_plugin/assets/src/constants.js
