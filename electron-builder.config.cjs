/** @type {import('electron-builder').Configuration} */
const pkg = require('./package.json')
const { signDarwinApp } = require('./scripts/sign-darwin-app.cjs')
const path = require('path')

module.exports = {
  ...pkg.build,
  win: {
    ...pkg.build.win,
    artifactName: 'DeskFlow-Setup-${version}-windows.${ext}'
  },
  mac: {
    ...pkg.build.mac,
    identity: null
  },
  async afterPack(context) {
    if (context.electronPlatformName !== 'darwin') return
    const appPath = path.join(
      context.appOutDir,
      `${context.packager.appInfo.productFilename}.app`
    )
    signDarwinApp(appPath)
  }
}
