// load_regions.js
// 사용법: server 폴더에서, node load_regions.js

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import pool from './db.js';

// 참고용: region 테이블 스키마
/*
CREATE TABLE region (
    region_code   CHAR(10)          NOT NULL COMMENT '법정동 코드 PK (SSDDDGGGRR)',
    depth         TINYINT UNSIGNED  NOT NULL COMMENT '1=시도, 2=시군구, 3=읍면동',
    name          VARCHAR(100)      NOT NULL COMMENT '지역명',
    parent_code   CHAR(10)          NULL COMMENT '상위 region_code FK',
    PRIMARY KEY (region_code),
    CONSTRAINT fk_region_parent
        FOREIGN KEY (parent_code) REFERENCES region(region_code)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
*/

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function makeRegions(csvFilePath) {
    
    // 1. CSV 읽기
    const filePath = path.join(__dirname, csvFilePath);
    const csv = fs.readFileSync(filePath, 'utf8');

    const records = parse(csv, {
        columns: [
            'code',       // 법정동코드
            'sido',       // 시도명
            'sigungu',    // 시군구명
            'eupmyeon',   // 읍면동명
            'ri',         // 리명
            'rank',       // 순위
            'createdAt',  // 생성일자
            'deletedAt',  // 삭제일자
            'oldCode',    // 과거법정동코드
        ],
        skip_empty_lines: true,
        trim: true,
    });

    
    // 2. CSV → region 레코드 변환
    const regions = [];

    for (const row of records) {
        const rawCode = row.code ?? '';
        const code = rawCode.trim();
        if (!code) continue; // 안전장치

        const sido = (row.sido ?? '').trim();
        const sigungu = (row.sigungu ?? '').trim();
        const eupmyeon = (row.eupmyeon ?? '').trim();
        const ri = (row.ri ?? '').trim();
        const deletedAt = (row.deletedAt ?? '').trim();

        // 폐지된 코드면 스킵
        if (deletedAt) continue;

        let depth;
        let name;
        let parentCode = null;

        // depth 판정 (리 단위는 사용하지 않고 1~3단계만)
         // 예: 11 000 000 00
        if (!sigungu && !eupmyeon && !ri) { // 시도 레벨
            depth = 1;
            name = sido;
            parentCode = null;
        } else if (sigungu && !eupmyeon && !ri) { // 시군구 레벨
            depth = 2;
            name = sigungu;
            parentCode = code.slice(0, 2) + '00000000';
        } else if (sigungu && eupmyeon && !ri) { // 읍면동 레벨
            depth = 3;
            name = eupmyeon;
            parentCode = code.slice(0, 5) + '00000';
        } else {
            // 리 단위 등은 현재 스키마(depth 1~3)에서 사용하지 않으므로 스킵
            continue;
        }

        if (!name) continue; // 이름 비어 있으면 스킵

        regions.push({
            region_code: code,
            depth,
            name,
            parent_code: parentCode,
        });
    }

    // 부모(1,2단계)가 먼저 INSERT 되도록 정렬
    regions.sort((a, b) => a.depth - b.depth);

    console.log(`총 ${regions.length}개 region 레코드 준비됨`);
    return regions;
}

async function insertRegions(regions) {
    // 3. INSERT 수행
    const insertSql = `
        INSERT INTO region (region_code, depth, name, parent_code)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            depth = VALUES(depth),
            name = VALUES(name),
            parent_code = VALUES(parent_code)
    `;

    for (const r of regions) {
        await pool.execute(insertSql, [
            r.region_code,
            r.depth,
            r.name,
            r.parent_code,
        ]);
    }

    console.log('region 테이블 채우기 완료');
}

async function main() {
    const regions = makeRegions('region_20250807.csv');
    await insertRegions(regions);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
