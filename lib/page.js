'use strict'

/* native modules */
const path = require('path')

/* npm modules */
const changeCase = require('change-case')
const fs = require('fs-extra')
const hasha = require('hasha')

/* global config */
require('./config')

/* app modules */

/* exports */
module.exports = class Page {

    constructor (args = {}) {
        assert(args.data, 'data required')
        assert(typeof args.data.title, 'data.title required')
        assert(args.pageGroup, 'pageGroup required')
        assert(defined(args.site), 'site required')
        assert(typeof args.template === 'string', 'template required')

        this.data = args.data
        if (!this.data.path) {
            this.data.path = changeCase.paramCase(this.data.title)
        }
        this.images = args.images || []
        this.pageGroup = args.pageGroup
        this.published = false
        this.site = args.site
        this.template = args.template
    }

    addImage (path) {
        this.images.push(path)
    }

    async getLink () {
        const pagePath = this.getPath()

        if (!this.site.site[pagePath]) {
            await this.publishPlaceholder(pagePath)
        }

        const ciph = this.site.site[pagePath].original.ciph

        return {
            href: ciph.links.ciph.open,
            title: this.data.title,
        }
    }

    getPath () {
        const path = this.pageGroup.getPath()
        path.push(this.data.path)
        return `/${path.join('/')}`
    }

    async publish (data) {
        const pagePath = this.getPath()
        if (this.site.paths[pagePath]) {
            console.log(this.site.paths)
        }
        assert(!this.site.paths[pagePath], `path conflict ${pagePath}`)
        this.site.paths[pagePath] = true

        Object.assign(this.data, data)

        const template = this.site.getTemplate(this.template)
        const markdown = template(this.data)

        const fileName = `index-${changeCase.paramCase(pagePath)}.md`
        const publishPath = path.resolve(this.site.publishPath, fileName)

        await fs.writeFile(publishPath, markdown)

        const publishFiles = this.images.concat([ publishPath ])
            .filter(file => !!file).sort()

        await this.site.publishPage(pagePath, 'collection', publishFiles, fileName)

        this.published = true
    }

    async publishPlaceholder (pagePath) {
        const fileName = `index-${changeCase.paramCase(pagePath)}.md`
        const publishPath = path.resolve(this.site.publishPath, fileName)
        await fs.writeFile(publishPath, '# placeholder')

        await this.site.publishPage(pagePath, 'collection', [publishPath], fileName)
    }

}
