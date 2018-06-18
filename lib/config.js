'use strict'

/* native modules */
const path = require('path')

/* npm modules */
const Bluebird = require('bluebird')
const ifDefined = require('if-defined')

global.assert = assert
global.defined = ifDefined
global.Promise = Bluebird

function assert (cond, msg) {
    if (!cond) throw new Error(msg)
}
