'use strict'

/* npm modules */
const changeCase = require('change-case')
const Promise = require('bluebird')

/* global config */
require('./config')

/* app modules */
const Page = require('./page')

/* exports */
module.exports = class PageGroup {

    constructor (args = {}) {
        assert(defined(args.site), 'site required')
        // breadcrumb links
        this.breadcrumbs = []
        // index page object for page group
        this.indexPage = args.indexPage || null
        // pages in page group
        this.pages = args.pages || []
        // parent page group - null if root
        this.parentPageGroup = args.parentPageGroup || null
        // path name
        this.path = args.path || ''
        // ciph site object
        this.site = args.site
        // child page groups
        this.subPageGroups = args.subPageGroups || []
    }

    async getBreadcrumbs () {
        if (this.breadcrumbs.length) {
            return this.breadcrumbs
        }
        if (!this.indexPage) {
            return this.breadcrumbs
        }
        if (this.parentPageGroup) {
            this.breadcrumbs = this.breadcrumbs.concat( await this.parentPageGroup.getBreadcrumbs() )
            this.breadcrumbs.push( await this.indexPage.getLink() )
        }
        else {
            const link = await this.indexPage.getLink()
            link.title = 'Home'
            this.breadcrumbs.push(link)
        }

        return this.breadcrumbs
    }

    getPath () {
        if (!this.parentPageGroup) {
            return []
        }
        if (!this.path) {
            console.log(this)
        }
        assert(this.path, 'path required')
        const path = this.parentPageGroup.getPath()
        path.push(this.path)
        return path
    }

    newIndexPage(args = {}) {
        if (!defined(args.pageGroup)) {
            args.pageGroup = this
        }
        if (!defined(args.site)) {
            args.site = this.site
        }
        assert(args.data, 'data required')
        args.data.path = 'index'
        this.indexPage = new Page(args)
        if (!this.path) {
            this.path = changeCase.paramCase(this.indexPage.data.title)
        }
        return this.indexPage
    }

    newPage (args = {}) {
        if (!defined(args.pageGroup)) {
            args.pageGroup = this
        }
        if (!defined(args.site)) {
            args.site = this.site
        }
        const page = new Page(args)
        this.pages.push(page)
        return page
    }

    newPageGroup (args = {}) {
        if (!defined(args.parentPageGroup)) {
            args.parentPageGroup = this
        }
        if (!defined(args.site)) {
            args.site = this.site
        }
        const pageGroup = new PageGroup(args)
        this.subPageGroups.push(pageGroup)
        return pageGroup
    }

    async publish () {
        console.log('publish page group')
        // page group links
        const pageGroups = []
        // publish all page groups
        for (const pageGroup of this.subPageGroups) {
            await pageGroup.publish()
            if (pageGroup.indexPage) {
                pageGroups.push( await pageGroup.indexPage.getLink() )
            }
        }
        // populate breadcrumbs
        const breadcrumbs = await this.getBreadcrumbs()
        // page links
        const pages = []
        // publish all pages
        await Promise.map(this.pages, async page => {
            try {
                await page.publish({ breadcrumbs })
                pages.push( await page.getLink() )
            }
            catch (err) {
                console.error(err.stack)
            }
        }, {concurrency: 20})
        // publish index page
        if (this.indexPage) {
            await this.indexPage.publish({ breadcrumbs, pages, pageGroups })
        }
    }

}
