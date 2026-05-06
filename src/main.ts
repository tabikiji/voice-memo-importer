import { App, Editor, MarkdownView, Modal, Notice, Plugin, MarkdownFileInfo } from 'obsidian';
import { DEFAULT_SETTINGS, MyPluginSettings, VoiceMemoImporterSettingTab } from "./settings.js";
import * as fsSync from "fs";
import { promises as fs } from "fs";
import OpenAI from "openai";
import path from "path";

// Remember to rename these classes and interfaces!

export default class MyPlugin extends Plugin {
	settings!: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		const input_folder = this.settings.input_dir;
		const key_for_APIkey = this.settings.key_for_APIkey
		// This creates an icon in the left ribbon.
		this.addRibbonIcon('dice', 'Sample', async(evt: MouseEvent) => {
			// リボンアイコンが押されたときの処理を記載
			new Notice('音声ファイルの文字起こしを開始します');

			//フォルダ内のファイルのパスを１件とって来る
			const input_dir = getOneVoiceFilePath(input_folder);
			//input_dir にある音声ファイルを取得
			const voiceStream = getVoiceMemoStream(input_dir);
			//音声ファイルから文字起こしデータを取得
			const transcript = await transcribe(voiceStream,key_for_APIkey);
			//取得したデータをもとにmdファイル作成
			await saveMemo(transcript);
			//mdファイルをvoicememoフォルダに配置する。なければフォルダを作る
			//処理済み音声ファイルを処理済みフォルダに移動。なければフォルダを作る
			//ポップアップ表示

		});

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status bar text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-modal-simple',
			name: 'Open modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'replace-selected',
			name: 'Replace selected content',
			editorCallback: (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
				console.log(editor.getSelection());
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-modal-complex',
			name: 'Open modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
				return false;
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new VoiceMemoImporterSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			new Notice("Click");
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

}

//設定画面から入力したフォルダのファイルパスを１件とって来る
export function getOneVoiceFilePath(inputDir: string): string {
  if (!fsSync.existsSync(inputDir)) {
    throw new Error("フォルダが存在しません");
  }

  const files = fsSync.readdirSync(inputDir);

  if (files.length === 0) {
    throw new Error("フォルダにファイルがありません");
  }

  // とりあえず1件目
  const fileName = files[0] as string;
  return path.join(inputDir, fileName);
}

//呼び出し側でループさせるため、１件処理を前提とする。（後続のメソッドも同様）
//〇ファイル自体を示すパス
//×ファイルが存在するフォルダのパス
export function getVoiceMemoStream(input_dir: string): fsSync.ReadStream {

	if (!fsSync.existsSync(input_dir)) {
		//todo : エラーで返す？そのまま終了させる？
		throw new Error("ファイルが存在しません")
	}

	return fsSync.createReadStream(input_dir);
}

//[note]Promise→すぐには値が返ってこないJSON形式のレスポンスに対して、結果と値を格納したオブジェクト
async function transcribe(readstream: fsSync.ReadStream,APIkey : string): Promise<string> {

	const client = new OpenAI({
		apiKey: APIkey
	});
	const transcription = await client.audio.transcriptions.create({
		file: readstream,
		model: "gpt-4o-transcribe",
		prompt: "日本語による音声メモです。「えっと」や「あー」などのフィラーは除去してください"
	});

	return transcription.text;
}


function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`; // 例: 20260506
}

async function getUniqueFilePath(dir: string, baseName: string): Promise<string> {
  let fileName = `${baseName}.md`;
  let filePath = path.join(dir, fileName);
  let count = 1;

  while (true) {
    try {
      await fs.access(filePath);
      // 存在する → 次の候補
      fileName = `${baseName}_${count}.md`;
      filePath = path.join(dir, fileName);
      count++;
    } catch {
      // 存在しない → これを使う
      return filePath;
    }
  }
}

export async function saveMemo(transcript: string) {
  const output_dir = "voiceMemo";
  await fs.mkdir(output_dir, { recursive: true });

  const dateStr = formatDate(new Date());
  const filePath = await getUniqueFilePath(output_dir, dateStr);

  const mdContent = `# ${dateStr}\n\n${transcript}`;

  await fs.writeFile(filePath, mdContent, "utf-8");
}

