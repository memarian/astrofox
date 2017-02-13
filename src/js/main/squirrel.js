import path from 'path';
import { spawn } from 'child_process';
import { app } from 'electron';
import debug from 'debug';

const log = debug('squirrel');

let run = function(args, done) {
    let updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');

    log('Spawning `%s` with args `%s`', updateExe, args);

    spawn(updateExe, args, {
        detached: true
    }).on('close', done);
};

export default function check() {
    if (process.platform === 'win32') {
        let cmd = process.argv[1];

        log('Processing squirrel command `%s`', cmd);

        let target = path.basename(process.execPath);

        if (cmd === '--squirrel-install' || cmd === '--squirrel-updated') {
            run(['--createShortcut=' + target + ''], app.quit);
            return true;
        }
        if (cmd === '--squirrel-uninstall') {
            run(['--removeShortcut=' + target + ''], app.quit);
            return true;
        }
        if (cmd === '--squirrel-obsolete') {
            app.quit();
            return true;
        }
    }
    return false;
}