# move mathjax to static folder for our hacky loading.
rm -r exercise_perseus_render/static
mkdir exercise_perseus_render/static
cp -r exercise_perseus_render/node_modules/perseus/lib/mathjax exercise_perseus_render/static/

# update the constants.js to store the mathjax config file name.
> exercise_perseus_render/assets/src/constants.js
config_file_name="$(basename exercise_perseus_render/static/mathjax/2.1/config/*)"
file_content="const ConfigFileName = '${config_file_name}'; module.exports = {ConfigFileName,};"
echo "${file_content}" >> exercise_perseus_render/assets/src/constants.js
