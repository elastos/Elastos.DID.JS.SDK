import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { initDid } from './initializedid';
import { initDidurl } from './didurlsample';
import { initRootIdentity } from './rootidentitysample';
import { restoreFromMnemonic } from './restorefrommnemonic';
import { issueCredential } from './issuecredential';
import { createPresentation } from './createpresentation';
import { presentationInJWT } from './presentationinjwt';
import { parseJWT } from './parsejwt';

yargs(hideBin(process.argv))
    .command("initDid", "Initialize the DID from zero",
        (yargs) => {}, async(argv) => { await initDid(argv);})
    .command("initDidurl", "Create the DIDURL from various methods",
        (yargs) => {}, (argv) => { initDidurl(argv);})
    .command("initRootIdentity", "Create the RootIdentity",
        (yargs) => {}, async(argv) => { await initRootIdentity(argv);})
    .command("restore", "Restore the RootIdentities and Dids from mnemonic",
        (yargs) => {}, async(argv) => { await restoreFromMnemonic(argv);})
    .command("issueCredential", "Issue the Credential",
        (yargs) => {}, async(argv) => { await issueCredential(argv);})
    .command("createPresentation", "Create the Presentation",
        (yargs) => {}, async(argv) => { await createPresentation(argv);})
    .command("presentationInJWT", "Pack the Presentation in the JWT",
        (yargs) => {}, async(argv) => { await presentationInJWT(argv);})
    .command("parseJWT", "Parse the JWT content",
        (yargs) => {}, async(argv) => { await parseJWT(argv);})
    .help()
    .argv
