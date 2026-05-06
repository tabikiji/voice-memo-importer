import fs from "fs";
import { getVoiceMemoStream } from "./main.js";

//importしてきたfsを、jestによってmockする
jest.mock("fs");
//mockしたのでメソッドの
const mockerFs = fs as jest.Mocked<typeof fs>;   

//正常系
test ("ファイルが存在するとき、",() =>{
    
}

)   