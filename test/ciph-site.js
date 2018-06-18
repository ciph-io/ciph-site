'use strict'

/* native modules */
const path = require('path')

/* npm modules */

/* app modules */
const CiphSite = require('../lib/ciph-site')

const site = new CiphSite({
    sitePath: path.resolve(__dirname, 'ciph-site.json'),
    templatePath: path.resolve(__dirname, 'templates'),
})

site.init().then(async () => {

    site.pageGroup.newIndexPage({
        template: 'index',
        data: {
            title: 'Vehicle Listings',
        },
    })

    const cars = site.pageGroup.newPageGroup()
    cars.newIndexPage({
        template: 'index',
        data: {
            title: 'Cars',
        }
    })

    const newCars = cars.newPageGroup()
    newCars.newIndexPage({
        template: 'index',
        data: {
            title: 'New Cars',
        }
    })
    newCars.newPage({
        template: 'page',
        images: [ path.resolve(__dirname, 'images', 'yugo.jpg') ],
        data: {
            title: '2018 Toyota Camry',
            content: 'Mid sized car',
        },
    })
    newCars.newPage({
        template: 'page',
        images: [ path.resolve(__dirname, 'images', 'yugo.jpg') ],
        data: {
            title: '2018 Mazda 3',
            content: 'Small hatchback',
        },
    })

    const usedCars = cars.newPageGroup()
    usedCars.newIndexPage({
        template: 'index',
        data: {
            title: 'Used Cars',
        },
    })
    usedCars.newPage({
        template: 'page',
        data: {
            title: '2005 Ford Focus',
            content: 'Small car',
        },
    })
    usedCars.newPage({
        template: 'page',
        data: {
            title: '2012 Honda Accord',
            content: 'Midsized car',
        },
    })

    const trucks = site.pageGroup.newPageGroup()
    trucks.newIndexPage({
        template: 'index',
        data: {
            title: 'Trucks',
        },
    })
    trucks.newPage({
        template: 'page',
        data: {
            title: '2018 Ford F-150',
            content: 'Fullsized pickup',
        },
    })
    trucks.newPage({
        template: 'page',
        data: {
            title: '2010 Toyota Tacoma',
            content: 'Compact pickup',
        },
    })

    await site.publish()
    await site.save(true, true)
}).catch(err => {
    console.error(err.stack)
})
