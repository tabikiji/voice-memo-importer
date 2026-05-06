import {App, PluginSettingTab, SecretComponent, Setting} from "obsidian";
import MyPlugin from "./main.js";

//[note]interface : 「この変数は設定されていないといけない」という制約。
//[note]設定が必要そうな項目はここに書く
//[note]
export interface MyPluginSettings {
	//音声ファイル取得先
	input_dir : string;
	//whisperのAPIキー
	key_for_APIkey : string;
}

//[note]defaultで入っている値を設定
//[note]
//[note]
export const DEFAULT_SETTINGS: MyPluginSettings = {
	input_dir : "",
	key_for_APIkey : ""
}

export class VoiceMemoImporterSettingTab extends PluginSettingTab {
	//[note]Mypluginのインスタンスを生成
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		//[note]親（PluginSettingTab）で定義されているコンストラクタをまず初期化
		super(app, plugin);
		//[note]親コンストラクタを今回のVoiceMemoImporterSettingTabコンストラクタに設定
		this.plugin = plugin;
	}

	//[note]画面描画を制御する部分	
	display(): void {
		//[note]ここがしっくりこない。
		//[note]
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('音声ファイル取得先ディレクトリ')
			.setDesc('音声メモを置いているフォルダを入力してください')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.input_dir)
				.onChange(async (value) => {
					this.plugin.settings.input_dir = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
      		.setName('API key')
      		.setDesc('APIキーを入力してください')
      		.addComponent(containerEl => new SecretComponent(this.app, containerEl)
        		.setValue(this.plugin.settings.key_for_APIkey)
        		.onChange(value => {
        		 	 this.plugin.settings.key_for_APIkey = value;
         		 	 this.plugin.saveSettings();
        }));
	}
}
