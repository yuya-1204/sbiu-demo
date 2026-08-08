#!/usr/bin/env python3
"""Convert the approved Aozora Bunko XHTML files into browser-fetchable JSON."""

from __future__ import annotations

import argparse
import html
import json
import re
import tempfile
from pathlib import Path
from typing import Any


COMMON: dict[str, Any] = {
    "provider": "青空文庫",
    "termsUrl": "https://www.aozora.gr.jp/guide/kijyunn.html",
    "copyrightStatus": "青空文庫の「著作権の切れている作品」として公開",
    "reuseSummary": (
        "青空文庫の取り扱い規準により、有償・無償を問わず複製・再配布・共有"
        "および形式変換が可能。"
    ),
    "metadataLicense": "CC BY 4.0",
    "retrievedOn": "2026-08-08",
    "originalCharacterSet": "JIS X 0208",
    "originalEncoding": "ShiftJIS",
    "outputEncoding": "UTF-8 (BOMなし)",
    "provenanceNotice": (
        "青空文庫作成ファイルを基にしています。入力・校正・制作に携わった"
        "ボランティアの情報を作品情報に保持しています。"
    ),
    "endorsementDisclaimer": (
        "本データおよび復職AI Readyは、青空文庫の関与・公認を受けたものではありません。"
    ),
}


WORKS: list[dict[str, Any]] = [
    {
        "id": "mikan",
        "sourceFileName": "mikan.html",
        "title": "蜜柑",
        "titleReading": "みかん",
        "author": "芥川龍之介",
        "authorCardForm": "芥川 竜之介",
        "orthography": "新字新仮名",
        "cardUrl": "https://www.aozora.gr.jp/cards/000879/card43017.html",
        "xhtmlUrl": "https://www.aozora.gr.jp/cards/000879/files/43017_17431.html",
        "textZipUrl": "https://www.aozora.gr.jp/cards/000879/files/43017_ruby_17394.zip",
        "sourceEdition": {
            "book": "蜘蛛の糸・杜子春",
            "publisher": "新潮文庫、新潮社",
            "firstPublication": "1968（昭和43）年11月15日",
            "inputEdition": "1989（平成元）年5月30日46刷",
            "proofEdition": "2004（平成16）年6月5日67刷",
            "parentBook": None,
            "parentPublisher": None,
            "parentFirstPublication": None,
        },
        "inputBy": "蒋龍",
        "proofreadBy": "noriko saito",
        "fileLastUpdated": "2005-01-07",
        "officialNotice": None,
        "editorialNotices": [
            "若い貧困層の少女に対する、現代では侮蔑的と受け取られ得る描写があります。"
            "時代背景に伴う表現として原文のまま掲載しています。"
        ],
    },
    {
        "id": "tebukuro",
        "sourceFileName": "tebukuro.html",
        "title": "手袋を買いに",
        "titleReading": "てぶくろをかいに",
        "author": "新美南吉",
        "authorCardForm": "新美 南吉",
        "orthography": "新字新仮名",
        "cardUrl": "https://www.aozora.gr.jp/cards/000121/card637.html",
        "xhtmlUrl": "https://www.aozora.gr.jp/cards/000121/files/637_13341.html",
        "textZipUrl": "https://www.aozora.gr.jp/cards/000121/files/637_ruby_4095.zip",
        "sourceEdition": {
            "book": "新美南吉童話集",
            "publisher": "岩波文庫、岩波書店",
            "firstPublication": "1996（平成8）年7月16日",
            "inputEdition": "1997（平成9）年7月15日第2刷",
            "proofEdition": None,
            "parentBook": None,
            "parentPublisher": None,
            "parentFirstPublication": None,
        },
        "inputBy": "大野晋",
        "proofreadBy": "伊藤祥",
        "fileLastUpdated": "2011-04-27",
        "officialNotice": None,
        "editorialNotices": [
            "大きな注意事項はありません。人間への恐怖や、狐が人に追われた回想が含まれます。",
            "童話作品です。成人向けプログラムでは、本人が選べる読書課題として扱います。",
        ],
    },
    {
        "id": "kagakusha",
        "sourceFileName": "kagakusha.html",
        "title": "科学者とあたま",
        "titleReading": "かがくしゃとあたま",
        "author": "寺田寅彦",
        "authorCardForm": "寺田 寅彦",
        "orthography": "新字新仮名",
        "cardUrl": "https://www.aozora.gr.jp/cards/000042/card2359.html",
        "xhtmlUrl": "https://www.aozora.gr.jp/cards/000042/files/2359_13797.html",
        "textZipUrl": "https://www.aozora.gr.jp/cards/000042/files/2359_ruby_4688.zip",
        "sourceEdition": {
            "book": "寺田寅彦随筆集　第四巻",
            "publisher": "岩波文庫、岩波書店",
            "firstPublication": (
                "1948（昭和23）年5月15日、1963（昭和38）年5月16日第20刷改版"
            ),
            "inputEdition": "1995（平成7）年7月15日第63刷",
            "proofEdition": "1997（平成9）年6月13日第65刷",
            "parentBook": None,
            "parentPublisher": None,
            "parentFirstPublication": None,
        },
        "inputBy": "（株）モモ",
        "proofreadBy": "かとうかおり",
        "fileLastUpdated": "2003-11-07",
        "officialNotice": None,
        "editorialNotices": [
            "「頭がよい／悪い」「田舎者」「朴念仁」など、能力評価のように響く古い表現が"
            "あります。筆者独自の比喩であり、利用者を評価するものではありません。"
        ],
    },
    {
        "id": "melos",
        "sourceFileName": "melos.html",
        "title": "走れメロス",
        "titleReading": "はしれメロス",
        "author": "太宰治",
        "authorCardForm": "太宰 治",
        "orthography": "新字新仮名",
        "cardUrl": "https://www.aozora.gr.jp/cards/000035/card1567.html",
        "xhtmlUrl": "https://www.aozora.gr.jp/cards/000035/files/1567_14913.html",
        "textZipUrl": "https://www.aozora.gr.jp/cards/000035/files/1567_ruby_4948.zip",
        "sourceEdition": {
            "book": "太宰治全集3",
            "publisher": "ちくま文庫、筑摩書房",
            "firstPublication": "1988（昭和63）年10月25日",
            "inputEdition": None,
            "proofEdition": "1998（平成10）年6月15日第2刷",
            "parentBook": "筑摩全集類聚版太宰治全集",
            "parentPublisher": "筑摩書房",
            "parentFirstPublication": "1975（昭和50）年6月～1976（昭和51）年6月",
        },
        "inputBy": "金川一之",
        "proofreadBy": "高橋美奈子",
        "fileLastUpdated": "2011-01-17",
        "officialNotice": None,
        "editorialNotices": [
            "殺害、処刑、人質、磔、絞殺の脅迫、流血、極度の疲労、裸体の描写が含まれます。"
        ],
    },
    {
        "id": "kojinshugi",
        "sourceFileName": "kojinshugi.html",
        "title": "私の個人主義",
        "titleReading": "わたしのこじんしゅぎ",
        "author": "夏目漱石",
        "authorCardForm": "夏目 漱石",
        "orthography": "新字新仮名",
        "cardUrl": "https://www.aozora.gr.jp/cards/000148/card772.html",
        "xhtmlUrl": "https://www.aozora.gr.jp/cards/000148/files/772_33100.html",
        "textZipUrl": "https://www.aozora.gr.jp/cards/000148/files/772_ruby_33099.zip",
        "sourceEdition": {
            "book": "ちくま日本文学全集　夏目漱石",
            "publisher": "筑摩書房",
            "firstPublication": "1992（平成4）年1月20日",
            "inputEdition": "1992（平成4）年1月20日第1刷",
            "proofEdition": "1998（平成10）年3月15日第2刷",
            "parentBook": "夏目漱石全集10",
            "parentPublisher": "ちくま文庫、筑摩書房",
            "parentFirstPublication": "1988（昭和63）年7月26日",
        },
        "inputBy": "真先芳秋",
        "proofreadBy": "かとうかおり",
        "fileLastUpdated": "2008-10-05",
        "officialNotice": (
            "この作品には、今日からみれば、不適切と受け取られる可能性のある表現が"
            "みられます。その旨をここに記載した上で、そのままの形で作品を公開します。"
            "（青空文庫）"
        ),
        "editorialNotices": [
            "青空文庫の公式注意表示を読書開始前にも提示し、別作品へ変更できるようにしてください。"
        ],
    },
]


def match_text(source: str, pattern: str, description: str) -> str:
    match = re.search(pattern, source, flags=re.IGNORECASE | re.DOTALL)
    if match is None:
        raise ValueError(f"{description}が見つかりません。")
    return html.unescape(match.group("value").strip())


def extract_main_text(source: str) -> str:
    main_open = re.search(
        r"<div\s+class=[\"']main_text[\"'][^>]*>", source, flags=re.IGNORECASE
    )
    if main_open is None:
        raise ValueError("div.main_textが見つかりません。")
    bibliography_open = re.search(
        r"<div\s+class=[\"']bibliographical_information[\"'][^>]*>",
        source[main_open.end() :],
        flags=re.IGNORECASE,
    )
    if bibliography_open is None:
        raise ValueError("div.bibliographical_informationが見つかりません。")
    end = main_open.end() + bibliography_open.start()
    body = source[main_open.end() : end]
    body = re.sub(r"</div>\s*$", "", body, flags=re.IGNORECASE | re.DOTALL)
    return body.strip()


def make_plain_text(body_html: str) -> str:
    text = re.sub(
        r"<(?:rt|rp)\b[^>]*>.*?</(?:rt|rp)>",
        "",
        body_html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text, flags=re.DOTALL)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def make_source(work: dict[str, Any]) -> dict[str, Any]:
    return {
        "provider": COMMON["provider"],
        "cardUrl": work["cardUrl"],
        "xhtmlUrl": work["xhtmlUrl"],
        "textZipUrl": work["textZipUrl"],
        "termsUrl": COMMON["termsUrl"],
        "copyrightStatus": COMMON["copyrightStatus"],
        "reuseSummary": COMMON["reuseSummary"],
        "metadataLicense": COMMON["metadataLicense"],
        "originalCharacterSet": COMMON["originalCharacterSet"],
        "originalEncoding": COMMON["originalEncoding"],
        "sourceEdition": work["sourceEdition"],
        "inputBy": work["inputBy"],
        "proofreadBy": work["proofreadBy"],
        "fileLastUpdated": work["fileLastUpdated"],
        "provenanceNotice": COMMON["provenanceNotice"],
    }


def make_conversion(work: dict[str, Any]) -> dict[str, Any]:
    return {
        "retrievedOn": COMMON["retrievedOn"],
        "convertedOn": "2026-08-08",
        "sourceFileName": work["sourceFileName"],
        "decodedWith": "Python cp932 codec（Shift_JIS互換）",
        "outputEncoding": COMMON["outputEncoding"],
        "extractedRegion": "青空文庫XHTMLのdiv.main_text内部",
        "preservedMarkup": [
            "ruby",
            "rb",
            "rt",
            "rp",
            "br",
            "青空文庫本文内のその他の安全なXHTML",
        ],
        "transformations": [
            "Shift_JISからUTF-8へ変換",
            "改行コードをLFへ統一",
            "本文領域をbodyHtmlとして抽出",
            "rtおよびrpを除いた検索・表示補助用plainTextを機械生成",
            "本文の字句変更・現代表記化・要約は行っていない",
        ],
        "endorsementDisclaimer": COMMON["endorsementDisclaimer"],
    }


def make_base_text(work: dict[str, Any]) -> str:
    edition = work["sourceEdition"]
    return f"底本：『{edition['book']}』／{edition['publisher']}"


def write_json(path: Path, value: Any) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def convert(source_directory: Path, output_directory: Path) -> list[dict[str, Any]]:
    if not source_directory.is_dir():
        raise FileNotFoundError(f"入力ディレクトリがありません: {source_directory}")
    output_directory.mkdir(parents=True, exist_ok=True)

    manifest_works: list[dict[str, Any]] = []
    results: list[dict[str, Any]] = []

    for work in WORKS:
        source_path = source_directory / work["sourceFileName"]
        if not source_path.is_file():
            raise FileNotFoundError(f"入力ファイルがありません: {source_path}")
        xhtml = source_path.read_bytes().decode("cp932").replace("\r\n", "\n")
        if "\ufffd" in xhtml:
            raise ValueError(f"{source_path.name}の変換後に置換文字U+FFFDがあります。")

        source_title = match_text(
            xhtml,
            r"<h1\s+class=[\"']title[\"'][^>]*>(?P<value>.*?)</h1>",
            "作品名",
        )
        source_author = match_text(
            xhtml,
            r"<h2\s+class=[\"']author[\"'][^>]*>(?P<value>.*?)</h2>",
            "著者名",
        )
        if source_title != work["title"]:
            raise ValueError(
                f"{source_path.name}の作品名が一致しません: {source_title!r}"
            )
        if source_author != work["author"]:
            raise ValueError(
                f"{source_path.name}の著者名が一致しません: {source_author!r}"
            )

        body_html = extract_main_text(xhtml)
        if not body_html:
            raise ValueError(f"{source_path.name}の本文が空です。")
        if re.search(
            r"<(?:script|iframe|object|embed)\b|\son[a-z]+\s*=",
            body_html,
            flags=re.IGNORECASE,
        ):
            raise ValueError(
                f"{source_path.name}の本文に許可していない実行要素があります。"
            )
        if "\ufffd" in body_html:
            raise ValueError(f"{source_path.name}の本文に置換文字U+FFFDがあります。")

        plain_text = make_plain_text(body_html)
        stats = {
            "plainTextCharacters": len(plain_text),
            "rubyCount": len(re.findall(r"<ruby\b", body_html, flags=re.IGNORECASE)),
            "lineBreakCount": len(
                re.findall(r"<br\s*/?>", body_html, flags=re.IGNORECASE)
            ),
            "imageCount": len(re.findall(r"<img\b", body_html, flags=re.IGNORECASE)),
        }
        source = make_source(work)
        notices = {
            "officialAozoraNotice": work["officialNotice"],
            "aiReadyEditorialNotices": work["editorialNotices"],
        }
        conversion = make_conversion(work)
        output_name = f"{work['id']}.json"
        browser_file = f"books/{output_name}"
        display_notice = work["officialNotice"] or "\n".join(
            work["editorialNotices"]
        )
        metadata = {
            "schemaVersion": 1,
            "id": work["id"],
            "title": work["title"],
            "titleReading": work["titleReading"],
            "author": work["author"],
            "authorCardForm": work["authorCardForm"],
            "language": "ja",
            "orthography": work["orthography"],
            "cardUrl": work["cardUrl"],
            "sourceLabel": COMMON["provider"],
            "baseText": make_base_text(work),
            "inputBy": work["inputBy"],
            "proofBy": work["proofreadBy"],
            "lastUpdated": work["fileLastUpdated"],
            "notice": display_notice,
            "file": browser_file,
            "source": source,
            "notices": notices,
            "conversion": conversion,
            "stats": stats,
        }
        book = {
            "metadata": metadata,
            "html": body_html,
            "plainText": plain_text,
            "stats": stats,
        }
        output_path = output_directory / output_name
        write_json(output_path, book)

        manifest_works.append(metadata)
        results.append(
            {
                "id": work["id"],
                "file": str(output_path),
                "bytes": output_path.stat().st_size,
                **stats,
            }
        )

    # The reader UI fetches manifest.json as a top-level array.
    manifest = manifest_works
    manifest_path = output_directory / "manifest.json"
    write_json(manifest_path, manifest)
    results.append(
        {
            "id": "manifest",
            "file": str(manifest_path),
            "bytes": manifest_path.stat().st_size,
        }
    )
    return results


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source",
        type=Path,
        default=Path(tempfile.gettempdir()) / "ai-ready-aozora",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "books",
    )
    args = parser.parse_args()
    results = convert(args.source, args.output)
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
