# move mathjax to static folder for our hacky loading.
rm -r exercise_perseus_renderer/static
mkdir exercise_perseus_renderer/static
cp -r exercise_perseus_renderer/node_modules/perseus/lib/mathjax exercise_perseus_renderer/static/
mkdir exercise_perseus_renderer/static/images
cp exercise_perseus_renderer/node_modules/perseus/images/throbber.gif exercise_perseus_renderer/static/images

# update the constants.js to store the mathjax config file name.
> exercise_perseus_renderer/assets/src/constants.js
config_file_name="$(basename exercise_perseus_renderer/static/mathjax/2.1/config/*)"
file_content="const ConfigFileName = '${config_file_name}';
module.exports = { ConfigFileName };"
echo "${file_content}" >> exercise_perseus_renderer/assets/src/constants.js
