#!/usr/bin/env node
const program = require('commander');
const merge = require('lodash.merge');
const inquirer = require('inquirer');
const { version } = require('./package.json');
const fs = require('fs');
const { promisify } = require('util');
const trim = require('lodash.trim');
const pickBy = require('lodash.pickby');
const transform = require('lodash.transform');
const buildMail = require('./build-mail.js');
const configWalker = require('./config-walker.js');

const writeFile = promisify(fs.writeFile);


const { output, args: [file] } = program
  .version(version)
  .description('Make tool to build mail')
  .option('-o, --output <file>', 'Output file')
  .option('-l, --locale <locale>', 'Locale')
  .arguments('<file>')
  .parse(process.argv);

const locale = program.locale || (process.env.LANG || '').substr(0, 2) || 'en';

const environnements = transform(
  pickBy(process.env || {}, (v, k) => k.startsWith('__')),
  (result, value, key) => { result[trim(key, '_').toLowerCase()] = value; },
  {},
);

if (!file) {
  throw new Error('file is missing');
}

(async () => {
  const config = await configWalker(file, process.cwd());
  merge(config.vars, environnements);
  const prompted = await inquirer.prompt((config
    .questions || [])
    .map((question) => {
      if (typeof question === 'string') {
        return {
          type: 'input',
          name: question,
          message: question,
        };
      }
      return question;
    })
    .filter(({ name }) => !config.vars[name]));
  const html = await buildMail(config, prompted, { locale });
  const keys = Object.keys(html);
  if (output) {
    await Promise.all(keys.map((async (k) => {
      return writeFile(`${output}.${k}`, html[k]);
    })));
  } else {
    keys.forEach(k => process.stdin.write(html[k]));
  }
})();
