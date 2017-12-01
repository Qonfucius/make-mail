const { promisify } = require('util');
const fs = require('fs');

const l_ = {
  transform: require('lodash.transform'),
  trim: require('lodash.trim'),
};
const { mjml2html } = require('mjml');
const handlebars = require('handlebars');
const handlebarsLayouts = require('handlebars-layouts');
const helpers = require('just-handlebars-helpers');

const configWalker = require('./config-walker');

const LOCALE_PLACEHOLDER = '$locale';
const MJML_EXT = 'mjml';
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
  if (!config.template) {
    throw new Error('template not found');
  }
  const switchParts = config
    .template
    .split('.')
    .reverse()
    .filter(p => [LOCALE_PLACEHOLDER, MJML_EXT, HBS_EXT].includes(p));
  const hasMjml = !!switchParts.find(p => p === MJML_EXT);
  const hasHbs = !!switchParts.find(p => p === HBS_EXT);
  let html = await readFile(config.template.replace(LOCALE_PLACEHOLDER, locale));
  html = html.toString();

  if (hasHbs) {
    config.partials = await Promise.all(
      l_.transform(
        config.partials,
        (result, value, key) => result.push(
          readFile(value.replace(LOCALE_PLACEHOLDER, locale))
            .then(t => ({ key, value: t.toString() })),
        ),
        [],
      ));
    config.partials.forEach(({ key, value }) => handlebars.registerPartial(key, value));
    html = handlebars.compile(html)(data);
  }

  if (hasMjml) {
    const mjml = mjml2html(html);

    if (mjml.errors.length) {
      throw new Error(mjml.errors);
    }
    html = mjml.html;
  }

  return html;
};
