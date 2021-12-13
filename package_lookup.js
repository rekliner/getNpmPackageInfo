/** 
 * Package lookup script
 * Generates a formatted HTML file with name, version and description of main dependencies in a package file 
 * RUsage: node package_lookup.js [optional file path] [optional breakout info true|false]
 * Can pass file path rather than copy this file to your project
 * Will output to packages.html and a bit to STDOUT
 * No dependencies required, just drop in the script and run.  You don't need to include this file or anything else in your project.
 * You could tweak this to display a more detail from NPM or your package lock.
 * 
 * ignores this NPM data: versions, maintainers, time, readme, readmeFilename, bugs, users, dist-tags (everything except latest), repository.type, repository.directory
 * **/

const https = require('https');
const fs = require("fs");
var path = require('path');
const fileName = process.argv.slice(2) && process.argv.slice(2)[0] != 'false' ? process.argv.slice(2)[0] : "./package.json";
let packages = require(fileName);  //reads the local package.json if no file is passed
let packageDir = path.parse(fileName).dir;
let packageInfo = [];
let additionalFields = {author: "author.name", latest: "dist-tags.latest", homepage: "homepage", repo: "repository.url",license: "license",};
let breakoutAdditional = process.argv.slice(2) && process.argv.slice(2)[1] == 'false' ? false : true;


const getAllPackages = async () => {
    let vals = await Promise.all( 
        Object.entries(packages.dependencies).map(p => 
            getPackageData(p[0])
            .then(res => {
                packageInfo.push({
                    name: p[0],
                    version: p[1],
                    ...res
                });
            })
        )
    ).then(r => {
        writePackages();
    });

}

async function getPackageData(npmId) {
    return new Promise((resolve) => {
        https.get('https://registry.npmjs.org/' + npmId, (resp) => {
            let data = '';
            // A chunk of data has been received.
            resp.on('data', (chunk) => {
                data += chunk;
            });

            resp.on('end', () => {
                resolve( JSON.parse(data));
            });

        }).on("error", (err) => {
            console.log("Error: " + err.message);
        });
    })
}

const leaf = (obj, path) => (path.split('.').reduce((value,el) => value && value[el], obj)) 

function writePackages() {
    //quick and dirty html so no templating package is required.
    pHtml = "<html><head></head><body> <h3>Dependencies:</h3> <ul>" + 
        packageInfo.map((p) => {
            console.log(p.name,p.version,p.description);
            let li = '<li ' +
                '> &nbsp;' +
                '<a target="_blank" style="font-weight:bolder;color:black;" href="' + (p.homepage ? p.homepage : "#") + '"' + 
                Object.entries(additionalFields).map(f => {
                    return typeof leaf(p,f[1]) !== 'undefined' ? ' data-' + f[0] + '="' + leaf(p,f[1]) + '"' : ""
                }).join("") +
                ' title="' + 
                Object.entries(additionalFields).map(f => {
                    return typeof leaf(p,f[1]) !== 'undefined' ? f[0] + ': ' + leaf(p,f[1]).replace('"','&quot;') + '\n' : ""
                }).join("") +                
                '">' + p.name + '</a> ' +
                '(' + p.version + '): ' + 
                '<span style="font-size:smaller">' + p.description +  
                (breakoutAdditional ?
                    (
                        "<ul>" + 
                        Object.entries(additionalFields).map(f => {
                            return typeof leaf(p,f[1]) !== 'undefined' ? '<li> ' + f[0] + ': ' + leaf(p,f[1]) + '</li>' : ""
                        }).join("") +
                        "</ul>"
                    )
                    : ""                
                ) + '</li>';

            return li;
        }).join("") + 
    '</ul></body></html>';
    
    fs.writeFile(packageDir + '/packages.htm',pHtml,err => {
        if (err) {
            console.error(err)
            return
        }
    });
};

getAllPackages();


