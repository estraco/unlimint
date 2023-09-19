import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';

type Entry = {
    size: number;
    base: number;
    time: string;
    cached: boolean;
};

type List = {
    id: string;
    type: 'table';
    columns: {
        values: string[];
        hidden?: boolean;
        id: string;
        color: string;
        latex: string;
    }[];
};

type JSONSerializable = string | number | boolean | null | JSONSerializable[] | { [key: string]: JSONSerializable };

function getLists(data: Entry[]): List[] {
    let i = 0;
    const lists: {
        [key: string]: List;
    } = {};

    for (const entry of data) {
        const key = `${entry.cached ? 'cached' : 'uncached'}-${entry.base}`;

        let lid: string;

        if (!lists[key]) {
            lists[key] = {
                id: lid = (i++).toString(),
                type: 'table',
                columns: []
            };

            lists[key].columns.push({
                values: [],
                hidden: true,
                id: (i++).toString(),
                color: '#000000',
                latex: `x_{${lid}}`
            });

            lists[key].columns.push({
                values: [],
                id: (i++).toString(),
                color: '#000000',
                latex: `y_{${lid}}`
            });
        }

        lid ??= lists[key].id;

        lists[key].columns[0].values.push(entry.size.toString());
        lists[key].columns[1].values.push(entry.time);
    }

    // find max length of y values
    let max = 0;

    for (const list of Object.values(lists)) {
        for (let i = 0; i < list.columns[1].values.length; i++) {
            const len = list.columns[1].values[i].length;

            if (len > max) {
                max = len;
            }
        }
    }

    for (const list of Object.values(lists)) {
        for (let i = 0; i < list.columns[1].values.length; i++) {
            // put decimal point at {max}th character
            list.columns[1].values[i] = list.columns[1].values[i].padStart(max, '0');
            list.columns[1].values[i] = `${list.columns[1].values[i].slice(0, -max)}.${list.columns[1].values[i].slice(-max)}`;
        }
    }

    return Object.values(lists);
}

export function mkstr() {
    const charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let str = '';

    for (let i = 0; i < 10; i++) {
        str += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return str;
}

export function jsonableToFD(jsonable: { [key: string]: JSONSerializable }): string {
    let str = '';

    for (const key in jsonable) {
        const value = typeof jsonable[key] === 'string' ? jsonable[key] as unknown as string : JSON.stringify(jsonable[key]);

        str += `${key}=${encodeURIComponent(value)}&`;
    }

    return str.slice(0, -1);
}

async function uploadToDesmos(file: string) {
    let filedata = fs.readFileSync(file, 'utf-8');

    // remove all bytes that are not valid JSON
    filedata = filedata.replace(/[^ -~]+/g, '');
    const parsed = JSON.parse(filedata) as Entry[];

    const calc_state = {
        version: 10,
        randomSeed: crypto.randomBytes(16).toString('hex'),
        graph: {
            viewport: {
                xmin: 0,
                ymin: 0,
                xmax: 0,
                ymax: 0
            }
        },
        expressions: {
            list: getLists(parsed)
        }
    };

    // get min and max x and y values for viewport
    for (const list of calc_state.expressions.list) {
        for (let i = 0; i < list.columns[0].values.length; i++) {
            const x = parseFloat(list.columns[0].values[i]);
            const y = parseFloat(list.columns[1].values[i]);

            if (x < calc_state.graph.viewport.xmin) {
                calc_state.graph.viewport.xmin = x;
            }

            if (x > calc_state.graph.viewport.xmax) {
                calc_state.graph.viewport.xmax = x;
            }

            if (y < calc_state.graph.viewport.ymin) {
                calc_state.graph.viewport.ymin = y;
            }

            if (y > calc_state.graph.viewport.ymax) {
                calc_state.graph.viewport.ymax = y;
            }
        }
    }

    const obj = {
        thumb_data: `data:image/png;base64,${fs.readFileSync('speed_perf.png', 'base64').replace(/=+$/, '')}`,
        graph_hash: mkstr(),
        my_graphs: 'false',
        is_update: 'false',
        calc_state: JSON.stringify(calc_state),
        lang: 'en'
    };

    const fd = jsonableToFD(obj);

    const { data } = await axios({
        url: 'https://www.desmos.com/api/v1/calculator/save',
        headers: {
            accept: 'application/json, text/javascript, */*; q=0.01',
            'accept-language': 'en-US,en;q=0.9',
            'cache-control': 'no-cache',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            pragma: 'no-cache',
            'sec-ch-ua': '"Not-A.Brand";v="99", "Opera GX";v="91", "Chromium";v="105"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'x-requested-with': 'XMLHttpRequest',
            Referer: 'https://www.desmos.com/calculator',
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        },
        method: 'POST',
        data: fd.toString()
    });

    data.url = `https://www.desmos.com/calculator/${data.hash}`;

    return data;
}

export default async function upload() {
    const data = await uploadToDesmos('speed_perf.json');

    console.log(data);
}

if (require.main === module) {
    upload();
}
