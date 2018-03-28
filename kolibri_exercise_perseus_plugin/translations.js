const https = require('https');
const AdmZip = require('adm-zip');
const ProgressBar = require('progress');
const temp = require('temp').track();
const fs = require('fs');

// List of currently supported languages and associated language and locale codes.
const languages = {
  'es-es': {
    lang: 'es',
    locale: 'es',
    crowdinLocale: 'es',
  },
  'es-mx': {
    lang: 'es',
    locale: 'mx',
    crowdinLocale: 'mx',
    // KA has no es-mx only es-es
    kaLocale: 'es',
  },
  'fr-fr': {
    lang: 'fr',
    locale: 'fr',
    crowdinLocale: null,
  },
  'hi-in': {
    lang: 'hi',
    locale: 'in',
    crowdinLocale: null,
  },
  'pt-pt': {
    lang: 'pt',
    locale: 'pt',
    crowdinLocale: 'pt',
  },
  'sw-tz': {
    lang: 'sw',
    locale: 'tz',
    crowdinLocale: 'tz',
    kaLocale: null,
  },
  'ar': {
    lang: 'ar',
    locale: null,
    crowdinLocale: null,
    crowdinDownloadLocale: 'sa',
  },
  'fa': {
    lang: 'fa',
    locale: null,
    crowdinLocale: null,
    crowdinDownloadLocale: 'ir',
  },
  'ur-pk': {
    lang: 'ur',
    locale: 'pk',
    crowdinLocale: 'pk',
  },
};

/*
 * Utility functions for generating the paths for locale files, both locally and on crowdin
 */
const localeFile = (lang, locale) => {
  let langCode;
  if (lang) {
    if (locale) {
      if (locale.length <= 2) {
        locale = locale.toUpperCase();
      } else {
        locale = locale[0].toUpperCase() + locale.slice(1);
      }
    }
    langCode = lang + (locale ? '_' + locale : '') + '/';
  } else {
    langCode = '';
  }
  return `${langCode}LC_FRONTEND_MESSAGES/exercise_perseus_render_module-messages.json`;
};

// Format the language code how crowdin expects it
const crowdinLangCode = (lang, locale) => {
  return lang + (locale ? '-' + locale.toUpperCase() : '');
};

// Path to the locale file for a language in the local locale folder
const localLocaleFile = (lang, locale) => {
  return './locale/' + localeFile(lang, locale);
}

// Which kolibri branch to upload translations to on Crowdin
const kolibriReleaseBranch = 'release-v0.6.x';

// Generate path for Kolibri crowdin translation upload
const remoteLocaleFile = (lang, locale) => {
  return `${kolibriReleaseBranch}/kolibri/locale/` + localeFile(lang, locale);
}

const kolibriProjectId = 'kolibri';

const downloadTranslations = (projectId, lang, locale, apiKey) => {
  const zipUrl = `https://api.crowdin.com/api/project/${projectId}/download/${crowdinLangCode(lang, locale)}.zip?key=${apiKey}`;
  return new Promise((resolve, reject) => {
    console.log(`Downloading translation files from ${projectId} for ${lang}-${locale}`);
    const request = https.get(zipUrl, response => {
      // Write to a temp file
      const zipFile = temp.openSync({ suffix: '.zip' }).path;
      const zipStream = fs.createWriteStream(zipFile);
      // Find the total size from the headers, so that we can provide a progress bar
      const size = parseInt(response.headers['content-length'], 10);
      // Make a nice progress bar!
      const downloadBar = new ProgressBar('  downloading [:bar] :rate/bps :percent :etas', {
        complete: '=',
        incomplete: ' ',
        width: 20,
        total: size
      });
      response.on('data', (chunk) => {
        // Whenever we get some data, write it out to the temp file
        zipStream.write(chunk);
        // And upload the progress bar
        downloadBar.tick(chunk.length);
      });
      response.on('end', () => {
        // When the download finishes, end the write stream
        zipStream.end(() => {
          // Then read the temporary zip file
          const zip = new AdmZip(zipFile);

          console.log(`\nTranslation files downloaded for ${lang}-${locale}`);
          // Return our zip file as the result
          resolve(zip);
        });
      });
    });
  }).catch(error => {
    console.log(error);
  });
}

module.exports = {
  languages,
  localeFile,
  remoteLocaleFile,
  localLocaleFile,
  crowdinLangCode,
  kolibriReleaseBranch,
  kolibriProjectId,
  downloadTranslations,
}
