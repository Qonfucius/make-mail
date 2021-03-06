const { resolve, join, dirname, relative } = require('path');

const l_ = { transform: require('lodash.transform') };

const CONFIG_JSON = 'config.json';
const DEFAULT_CONFIG = {
  vars: {},
  questions: [],
  partials: {},
  templates: {},
};

module.exports = async (configFile, rootPath = __dirname) => {
  rootPath = resolve(rootPath);
  let path = join(rootPath, configFile);
  const configFiles = [path];

  do {
    path = dirname(path);
    configFiles.unshift(join(path, CONFIG_JSON));
  } while (relative(rootPath, path) !== '');

  return configFiles
    .map((c) => {
      try {
        return require(c);
      } catch (e) {
        return {};
      }
    })
    .reduce(
      (merged, config, i) => {
        const dir = dirname(configFiles[i]);
        if (config.vars) {
          Object.assign(merged.vars, config.vars);
        }
        if (config.questions) {
          merged.questions = merged.questions.concat(config.questions);
        }
        if (config.partials) {
          const partials = l_.transform(
            config.partials,
            (result, value, key) => { result[key] = join(dir, value); },
            {},
          );
          Object.assign(merged.partials, partials);
        }
        if (config.templates) {
          Object.assign(
            merged.templates,
            l_.transform(
              config.templates,
              (result, value, key) => { result[key] = join(dir, value); },
              {},
            ),
          );
        }
        return merged;
      },
      DEFAULT_CONFIG,
    );
};
