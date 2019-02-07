const { promisify } = require('util');
const fs = require('fs');

const l_ = {
  transform: require('lodash.transform'),
  trim: require('lodash.trim'),
};
const mjml2html = require('mjml');
const handlebars = require('handlebars');
const handlebarsLayouts = require('handlebars-layouts');
const helpers = require('just-handlebars-helpers');

const configWalker = require('./config-walker');

const LOCALE_PLACEHOLDER = '$locale';
const MJML_EXT = 'mjml';
const TXT_EXT = 'txt';
const HBS_EXT = 'hbs';

handlebars.registerHelper(handlebarsLayouts(handlebars));
helpers.registerHelpers(handlebars);
handlebars.registerHelper(
  'asset',
  (name, { data: { root } }) =>
    [root.asset_url, root.asset_campaign, root.asset_target, name]
      .filter(f => f).map(part => l_.trim(part, '/')).join('/'),
);

const readFile = promisify(fs.readFile);

module.exports = async (config, data, { locale, root = __dirname } = {}) => {
  if (typeof config !== 'object') {
    config = await configWalker(config, root);
  }
  data = Object.assign(config.vars, data);
  const templateKeys = Object.keys(config.templates);
  if (!templateKeys.length) {
    throw new Error('template not found');
  }
  return Promise.all(templateKeys.map(async (templateKey) => {
    const template = config.templates[templateKey];
    const switchParts = template
      .split('.')
      .filter(p => [LOCALE_PLACEHOLDER, MJML_EXT, TXT_EXT, HBS_EXT].includes(p));
    const hasMjml = !!switchParts.find(p => p === MJML_EXT);
    const hasHbs = !!switchParts.find(p => p === HBS_EXT);
    let content = await readFile(template.replace(LOCALE_PLACEHOLDER, locale));
    content = content.toString();

    if (hasHbs) {
      config.partials = await Promise.all(
        l_.transform(
          config.partials,
          (result, value, key) => result.push(
            readFile([value, ...switchParts].join('.').replace(LOCALE_PLACEHOLDER, locale))
              .then(t => ({ key, value: t.toString() })),
          ),
          [],
        ));
      config.partials.forEach(({ key, value }) => handlebars.registerPartial(key, value));
      content = handlebars.compile(content)(data);
    }

    if (hasMjml) {
      const mjml = mjml2html(content);
      if (mjml.errors.length) {
        throw new Error('Compilation failed');
      }
      content = mjml.html;
    }


    return { [templateKey]: content };
  })).then(array => array.reduce((a, b) => Object.assign(a, b), {}));
};
