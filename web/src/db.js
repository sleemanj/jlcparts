import Dexie from 'dexie';
import * as pako from 'pako';
import untar from "js-untar";

if (!window.indexedDB) {
    alert("This page requires IndexedDB to work.\n" +
        "Your browser does not support it. Please upgrade your browser.");
}

async function persist() {
    return await navigator.storage?.persist?.();
}

export const db = new Dexie('jlcparts');
db.version(2).stores({
    settings: 'key',
    jsonlines: 'name'
});


const SOURCE_PATH = "data";
const dbWebPath = `${SOURCE_PATH}/all.jsonlines.tar`;

let jsonlines = {}; // copy of the database in memory so we only access the database once (doesn't really matter - it would be pretty fast anyway)
async function getJsonlines() {
    if (Object.keys(jsonlines).length === 0) {
        (await db.jsonlines.toArray()).forEach(obj => {
            jsonlines[obj.name] = obj.compressedData
        });
    }
    return jsonlines;
}

export async function unpackLinesAsArray(name) {
    let arr = [];
    await unpackAndProcessLines(name, (val, idx) => arr.push(val));
    return arr;
}

async function yieldExec() {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(), 0);
    });
}

let didSplit = false;
export async function unpackAndProcessLines(name, callback, checkAbort, filterIds) {
    await getJsonlines();

    if (jsonlines[name] === undefined) {
        return;
    }

    let time = new Date().getTime();

    if (!didSplit && name === 'components') {
        didSplit = true;
        await ensureSplitComponentsBySubcategory();
    }

    if (!window.DecompressionStream) {
        console.error("DecompressionStream is not supported in this environment.");
        return;
    }
    
    const compressedDataArray = [];
    if (!Array.isArray(jsonlines[name])) {
        compressedDataArray.push(jsonlines[name]);
    } else {
        filterIds = filterIds && new Set(filterIds);
        for (const item of jsonlines[name]) {
            if (item && (!filterIds || filterIds.has(item.id))) {
                compressedDataArray.push(item.compressedData);
            }
        };
    }

    let abort = false;
    let lastYield = new Date().getTime();
    for (const compressedData of compressedDataArray) {
        const decompressionStream = new window.DecompressionStream('gzip');

        // Convert the ArrayBuffer to a ReadableStream
        const inputStream = new ReadableStream({
            start(controller) {
                controller.enqueue(compressedData);
                controller.close();
            },
        });

        // Pipe the input stream through the decompression stream
        const decompressedStream = inputStream.pipeThrough(decompressionStream);

        // Convert the stream into text
        const textStream = decompressedStream.pipeThrough(new window.TextDecoderStream());

        const reader = textStream.getReader();  // to read chunks of text from stream
        let chunk = '';
        let idx = 0;

        try {
            while (true) {

                // Periodically allow UI to do what it needs to, including updating any abort flag.
                // This does slow down the this function a variable amount (could be <100ms, could be a few seconds) 
                const now = new Date().getTime();
                if (now - lastYield > 300) {
                    await yieldExec();
                    console.log('yielded for ', new Date().getTime() - now, 'ms');
                    lastYield = new Date().getTime();

                    if (checkAbort && checkAbort()) {   // check abort flag
                        abort = true;
                        break;
                    }
                }


                const { done, value } = await reader.read();
                if (done) {
                    // If there's any remaining line, process it as well -- should never happen
                    if (chunk) {
                        callback(chunk, idx++);
                    }
                    break;
                }

                chunk += value;

                let start = 0;
                while (true) {
                    let pos = chunk.indexOf('\n', start);
                    if (pos >= 0) {
                        if (callback(chunk.slice(start, pos), idx++) === 'abort') {
                            break;  // quit early
                        }
                        start = pos + 1;
                    } else {
                        chunk = chunk.slice(start); // dump everything that we've processed
                        break;  // no more lines in our chunk
                    }
                }
            }

        } finally {
            reader.releaseLock();
        }

        if (abort) {
            break;
        }
    }

    console.log(`Time to gunzip & segment ${name}: ${new Date().getTime() - time}`);
}

async function ensureSplitComponentsBySubcategory() {
    if (Array.isArray(jsonlines['components'])) {   // already converted
        return;
    }

    let components  = [];
    let schema;

    await unpackAndProcessLines('components', (compStr, idx) => {
        let comp = JSON.parse(compStr);

        if (idx === 0) {    // first line is always schema lookup
            schema = comp;
        } else {
            const id = +comp[schema.subcategoryIdx];
            if (!components[id]) {
                components[id] = new pako.Deflate({level: 9, gzip: true});
                components[id].push(JSON.stringify(schema) + '\n', false);    // first line is always schema
            }

            components[id].push(compStr + '\n');
        }
    });

    for (const id in components) {
        components[id].push('', true);     // close streams
        components[id] = {id: +id, compressedData: components[id].result};   // replace with compressed bytestream
    }

    jsonlines['components'] = components;
    let result = await db.jsonlines.put({ name: 'components', compressedData: components });
    console.log(result);
}

// Updates the whole component library, takes a callback for reporting progress:
// the progress is given as list of tuples (task, [statusMessage, finished])
export async function updateComponentLibrary(report) {
    await persist();

    let progress = {};
    let updateProgress = (name, status) => {
        progress[name] = status;
        report(progress);
    };

    // get new db files
    const downloadingTitle = `Downloading ${dbWebPath}`;
    updateProgress(downloadingTitle, ["In progress", false]);
    const resp = await fetch(dbWebPath);
    if (resp.status === 200) {
        const data = await resp.arrayBuffer();
        updateProgress(downloadingTitle, ["OK", true]);

        const untarTitle = `Updating database`;
        updateProgress(untarTitle, ["In progress", false]);

        const files = await untar(data);
        for (const file of files) {
            const basename = file.name.split('.')[0];
            let result = await db.jsonlines.put({ name: basename, compressedData: file.buffer });
            console.log(result);

            // store copy in memory (we can load from indexeddb on startup)
            jsonlines[basename] = file.buffer;
        }

        updateProgress(untarTitle, ["OK", true]);

        db.settings.put({
            key: "lastUpdate",
            value: resp.headers.get('Last-Modified') || new Date().toUTCString()
        });

    } else {
        updateProgress(downloadingTitle, ["Download failed", false]);
    }
}

// Check if the component library can be updated
export async function checkForComponentLibraryUpdate() {
    let lastUpdate = (await db.settings.get("lastUpdate"))?.value || new Date(0).toUTCString();

    let head = await fetch(dbWebPath, {
        method: 'HEAD',
        headers: {
            'If-Modified-Since': lastUpdate
        }
    });

    let updateAvailable = head.status === 200;   // 304 if not modified; any error means we don't know if there's an update
    return updateAvailable;
}

// Fetch a JSON. If error occures,
export async function fetchJson(path, errorIntro) {
    let response = await fetch(path);
    if (!response.ok) {
        throw Error(errorIntro + response.statusText);
    }

    let contentType = response.headers.get('Content-Type');
    if (!contentType) {
        throw Error(errorIntro + 'Missing "Content-Type" header for: ' + path);
    }

    try {
        if (contentType.includes("application/json")) {
            return await response.json();
        }
        if (contentType.includes("application/gzip")) {
            let data = await response.arrayBuffer();
            let text = pako.ungzip(data, { to: 'string' });
            return JSON.parse(text);
        }
    }
    catch (error) {
        throw Error(errorIntro + `${error}: ` + path);
    }

    throw Error(errorIntro + `Response is not a (compressed) JSON, but ${contentType}: ` + path);
}
