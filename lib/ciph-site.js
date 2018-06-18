'use strict'

/* native modules */
const path = require('path')

/* npm modules */
const CiphPublisher = require('ciph-core/lib/publisher')
const Handlebars = require('handlebars')
const changeCase = require('change-case')
const fs = require('fs-extra')
const hasha = require('hasha')
const jsonStableStringify = require('json-stable-stringify')

/* global config */
require('./config')

/* app modules */
const PageGroup = require('./page-group')

/* exports */
module.exports = class CiphSite {

    constructor (args = {}) {
        // root page group contains all pages / page-groups
        this.pageGroup = args.pageGroup || null
        // index of paths - all pages must have unique path
        this.paths = {}
        // count of published files since last save
        this.publishedCount = 0
        // directory to publish files to
        this.publishPath = args.publishPath || path.resolve(process.cwd(), `.ciph-site-${Date.now()}-${process.pid}`)
        // secret for publishing
        this.secret = args.secret
        // stored site data
        this.site = {}
        // digest of site database
        this.siteDigest = ''
        // path for JSON file of site data
        this.sitePath = args.sitePath || path.resolve(process.cwd(), 'ciph-site.json')
        // template dir
        this.templatePath = args.templatePath || path.resolve(process.cwd(), 'templates')
        // compiled templates by name
        this.templates = {}
        // user id for publishing
        this.userid = args.userid
    }

    getPage (pagePath) {
        return this.site[pagePath]
    }

    getTemplate (template) {
        assert(this.templates[template], `invalid template ${template}`)
        return this.templates[template]
    }

    async init () {
        // load collection file if it exists
        if (await fs.pathExists(this.sitePath)) {
            // load collection data
            const data = await fs.readFile(this.sitePath, 'utf8')
            // store digest
            this.siteDigest = hasha(data)
            // deserialize
            this.site = JSON.parse(data)
        }

        // create publish dir
        await fs.ensureDir(this.publishPath)

        // compile templates
        const templates = await fs.readdir(this.templatePath)
        // load and parse each template
        for (const template of templates) {
            // load file
            const templateData = await fs.readFile(path.resolve(this.templatePath, template), {encoding: 'utf8'})
            // get template name from file
            const templateName = template.replace(/\.hbs$/, '')
            // store compiled template
            this.templates[templateName] = Handlebars.compile(templateData)
        }

        // create default page group if not set
        if (!this.pageGroup) {
            this.pageGroup = new PageGroup({site: this})
        }
    }

    async publish () {
        // publish site
        await this.pageGroup.publish()
    }

    async publishPage (pagePath, contentType, files, indexFileName) {
        const publishArgs = {
            agreeCharges: true,
            assertOwnership: true,
            indexFileName: indexFileName,
            userid: this.userid,
            secret: this.secret,
            quiet: true,
        }

        const digests = []

        for (const file of files) {
            const digest = await hasha.fromFile(file, {algorithm: 'sha256'})
            digests.push(digest)
        }

        const digest = hasha(digests.join(''))

        if (this.site[pagePath]) {
            const previous = this.site[pagePath].current || this.site[pagePath].original

            if (previous.digest === digest) {
                console.log(`${pagePath} - unchanged`)
                return
            }
            else {
                publishArgs.replaceLink = previous.ciph.links.ciph.open
                publishArgs.replaceToken = previous.ciph.replaceToken

                console.log(`${pagePath} - publish replacement`)
            }
        }
        else {
            console.log(`${pagePath} - publish original`)
        }

        const ciph = await CiphPublisher.publish(contentType, files, publishArgs)

        if (this.site[pagePath]) {
            this.site[pagePath].current = { ciph, digest }
        }
        else {
            this.site[pagePath] = { original: { ciph, digest } }
        }

        if (this.publishedCount++ >= 10) {
            await this.save(true)
            this.publishedCount = 0
        }
    }

    async save (force, clean) {
        console.log(`save - force: ${force}`)
        // get file data
        const json = jsonStableStringify(this.site)
        // backup existing collection and save if exists
        if (!force && await fs.pathExists(this.sitePath)) {
            // get digest of data
            const digest = hasha(json)
            // do not save if not changed
            if (this.digest === digest) {
                return
            }
            // move existing collection file to history
            await fs.rename(this.sitePath, `${this.sitePath}.bak`)
            // save collection
            await fs.writeFile(this.sitePath, json)
        }
        // otherwise save new
        else {
            await fs.writeFile(this.sitePath, json)
        }
        if (clean) {
            // delete publish directory when done
            await fs.remove(this.publishPath)
        }
    }

}
