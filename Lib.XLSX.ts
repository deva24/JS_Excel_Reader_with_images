module Lib
{
	class Async<T>
	{
		public $_tfn:(arg:T)=>void;
		public $_cfn:(arg:ExceptionInformation)=>void;

		then(Callback:(arg:T)=>void):Async<T>
		{
			this.$_tfn = Callback;
			return this;
		}
		catch(Callback:(arg:ExceptionInformation)=>void):Async<T>
		{
			this.$_cfn = Callback;
			return this;
		}
	}

	module IO
	{
		export class Stream
		{
			private _data : Uint8Array;
			private _pos : number;
			private _bitPos : number;

			// private __pos : number;
			// private __bitPos : number;

			// Mark()
			// {
			// 	this.__bitPos = this._bitPos;
			// 	this.__pos = this._pos;
			// }

			// Recall()
			// {
			// 	this._bitPos = this.__bitPos;
			// 	this._pos = this.__pos;
			// }

			constructor(byteArray: ArrayBuffer)
			{
				this._pos = 0;
				this._data = new Uint8Array(byteArray);
				this._bitPos=0;
			}

			ReadUInt(bytes:number):number
			{
				if(this._bitPos!=0)
				{
					this._bitPos=0;
					this._pos++;
				}
				
				let ret = 0;
				let fact = 1;

				for(;bytes>0;bytes--)
				{
					let byte = this._data[this._pos]
					ret += byte*fact;
					fact*=256;
					this._pos++;
				}
				return ret;
			}

			ReadString(bytes:number):string
			{
				this._bitPos=0;
				var ret = '';
				while(bytes-->0)
				{
					var byte = this.ReadUInt(1);
					ret += String.fromCharCode(byte);
				}
				return ret;
			}

			ReadBytes(bytes:number):Uint8Array
			{
				var ret = new Uint8Array(bytes);
				var i=0;
				while(bytes-->0)
				{
					ret[i++] = this._data[this._pos++]; 
				}
				return ret;
			}

			ReadBits(bits:number,reverse:boolean=false):number
			{
				var ret;

				if(reverse)
				{
					ret = this._ReadBitsLeftToRight(bits);
				}
				else
				{
					ret = this._ReadBitsRightToLeft(bits);
				}

				return ret;
			}

			private _ReadBitsLeftToRight(bits:number):number
			{
				let ret = 0;
				let m = 1<<this._bitPos;
				let fac = 1 << (bits-1);

				while(bits-->0)
				{
					let byte = this._data[this._pos];
					let bit = (byte&m)>0?1:0;

					ret += bit * fac;

					fac>>=1;

					this._bitPos++;
					if(this._bitPos==8)
					{
						this._bitPos = 0;
						this._pos++;
						m=1;
					}
					else
						m<<=1;
				}

				return ret;
			}

			private _ReadBitsRightToLeft(bits:number):number
			{
				let ret = 0;
				let m = 1<<this._bitPos;
				let fac = 1;

				while(bits-->0)
				{
					let byte = this._data[this._pos];
					let bit = (byte&m)>0?1:0;

					ret += bit * fac;

					fac<<=1;

					this._bitPos++;
					if(this._bitPos==8)
					{
						this._bitPos = 0;
						this._pos++;
						m=1;
					}
					else
						m<<=1;
				}

				return ret;
			}

			GetPos():number
			{
				return this._pos;
			}
			SetPos(val:number)
			{
				this._pos = val;
				this._bitPos=0;
			}

			CanRead():boolean
			{
				return this._pos<this._data.length;
			}

			OffsetPos(val:number):number
			{
				this._pos+=val;
				this._bitPos=0;
				return this._pos;
			}

			// PrintBits(length:number,skip:number=0,reverse:boolean=false)
			// {
			// 	let ret = '';
			// 	let _pos = this._pos;
			// 	let _bitPos = this._bitPos;

			// 	if(skip>0)this.ReadBits(skip);
			// 	let byte = this.ReadBits(length,reverse);

			// 	let m = 1;
			// 	let hex = '';

			// 	let dth = '0123456789ABCDEF';
			// 	let hexNum = 0;
			// 	let h = 1;

			// 	let bin = '';
				

			// 	for(var i=0; i<length;i++)
			// 	{
			// 		let bit = 0;
			// 		if((byte & m)>0)bit = 1;

			// 		hexNum+=bit*h;

			// 		bin = bit.toString() + bin;

			// 		m<<=1;
			// 		h<<=1;

			// 		if((i+1)%4==0)
			// 		{
			// 			bin = ' ' + bin;
			// 			hex = dth.charAt(hexNum) + hex;
			// 			hexNum = 0;
			// 			h = 1;
			// 		}
			// 	}
			// 	bin = bin.trim();

			// 	if(hexNum!=0) hex = dth.charAt(hexNum) + hex;
			// 	ret = '0x' +hex + ' 0b' + bin + ' ('+byte+')'
				
			// 	this._bitPos = _bitPos;
			// 	this._pos = _pos;
				
			// 	return ret;	
			// }
		}

		export class Uint8ArrayWriter
		{
			data : Uint8Array;
			index : number;
			constructor(size:number)
			{
				this.data = new Uint8Array(size);
				this.index = 0;
			}
			push(byte:number)
			{
				this.data[this.index++] = byte;
			}
		}
	}

	module Huffman
	{
		export class HuffmanDecoder
		{
			MapObj:{[dial:string]:number};
			Value:number;
			private _AC:string;
			init:boolean;
			private _maxLen :number;

			constructor()
			{
				this._maxLen = 0;
				this.MapObj = {};
				this.Value = 0;
				this.init=false;
				this._AC = '';
			}

			ConstructUsingLength(CodeLengths:number[])
			{
				// Generate Map of Length and Symbols
					var LenSymbolsMap = {} as {[length:number]:number[]};
					var LengthsRequestedFor = [] as number[];

					for(var i=0; i<CodeLengths.length; i++)
					{
						let CodeLength = CodeLengths[i];
						
						if(this._maxLen<CodeLength)this._maxLen = CodeLength;

						if(LenSymbolsMap[CodeLength]==null)
							LenSymbolsMap[CodeLength] = [];
						
						let Map = LenSymbolsMap[CodeLength];

						Map.push(i);
						if(LengthsRequestedFor.indexOf(CodeLength)==-1 && CodeLength>0)LengthsRequestedFor.push(CodeLength);
					}

					LengthsRequestedFor.sort(function(a,b){
						if(a<b)return -1;
						else if(a>b)return 1;
						else return 0;
					});
				// End Region

				// Generate Huffman Code
					var lenAvailable = 1;
					var flip = 1;

					var symbols1 = ['0','1']as string[];
					var symbols2 = [] as string[];

					var symbols : string[];
					var newSymbols : string[] = symbols1;

					for(var i=0; i<LengthsRequestedFor.length; i++)
					{
						let lenRequest = LengthsRequestedFor[i];

						while(lenRequest > lenAvailable)
						{
							if(flip==1)
							{
								symbols = symbols1;
								newSymbols = symbols2;
								flip = 2;
							}
							else
							{
								symbols = symbols2;
								newSymbols = symbols1;
								flip = 1;
							}

							newSymbols.length = 0;

							symbols.forEach(codes=>
							{
								newSymbols.push('0' + codes);
								newSymbols.push('1' + codes);
							});

							symbols.length = 0;

							lenAvailable++;
						}

						for(var j=0; j<LenSymbolsMap[lenRequest].length; j++)
						{
							var symbol = LenSymbolsMap[lenRequest][j];
							var HuffmanCode = newSymbols[0];

							this.MapObj[HuffmanCode] = symbol;
							newSymbols.splice(0,1);
						}
					}
				// End Region

				this.init = true;
			}
			
			AddBit(bit:number) : boolean
			{
				if(!this.init) throw 'HuffmanDecoder not initiated';

				this._AC = bit.toString() + this._AC;
				if(this._AC.length>this._maxLen)
				{
					throw 'Huffman Code not matched';
				}

				let val = this.MapObj[this._AC];

				if(val!=null)
				{
					this.Value = val;
					this._AC = '';
					return true;
				}
				else
					return false;
			}

			ReadNext(strm : IO.Stream)
			{
				while(!this.AddBit(strm.ReadBits(1)));
				return this.Value;
			}
		}

	}

	module UTF8
	{
		export function FromASCII(text:string) : string
		{
			let len = text.length;


			let acs = '';

			for (var i = 0; i < len; i++)
			{
				let _m = 1 << 7;
				let bits = 7;
				let extraBytes = 0;
				
				let byte = text.charCodeAt(i);
				let charCode = 0;

				// Determine bitLength and extra Bytes;
					if((_m&byte)>0)
					{
						_m>>>=1;
						bits--;
						while ((_m & byte) > 0)
						{
							bits--;
							extraBytes++;
							_m >>>= 1;
						}
					}
				// End Region

				// Prepare Mask and append from first byte
					let mask = (1<<bits)-1;
					charCode = byte & mask;
				// End Region

				// Read consecurive bytes
				if(extraBytes>0)
				{
					i++;
					for(var j=extraBytes+i; i<j; i++)
					{
						byte = text.charCodeAt(i);
						let mask = (1<<6)-1;
						charCode<<=6;
						charCode+=(mask&byte);
					}
					i--;
				}
				// End Region

				acs += String.fromCharCode(charCode);
			}
			return acs;
		}
	}

	module Container
	{
		export class Reader
		{
			private _inStream : IO.Stream;
			private FileBlock : Parsers.File.FileParser[];

			FileSystem:FileSystem;

			constructor(InStream : IO.Stream)
			{
				this._inStream = InStream;
				this.FileBlock = [];
				
				//parse all blocks
				while(InStream.CanRead())
					{if(!this.parse())break;}

				this.FileSystem = new FileSystem();

				this.FileBlock.forEach(FileBlock=>
				{
					this.FileSystem.addFileByAbsolutePath(FileBlock.Header.fileName,FileBlock.FileContent);
				});
			}

			private parse()
			{
				let sig = this._inStream.ReadUInt(4);
				let Parser = Parsers.getParser(sig,this._inStream);
				let ret = false;
				if(Parser!=null)
				{
					let Record = Parser;
					if(Record instanceof Parsers.File.FileParser)
					{
						this.FileBlock.push(Record);
					}
					ret = true;

				}
				else
				{
					this._inStream.OffsetPos(-4);
					console.warn('Ignoring non-file blocks');
				}
				return ret;
			}
		}

		export class FileSystem
		{
			root : any;
			private _xmlParser : DOMParser;
			constructor()
			{
				this.root = {};
				this._xmlParser = new DOMParser();
			}

			addFileByAbsolutePath(FilePath:string,FileContent : Uint8Array)
			{
				FilePath = FilePath.toLowerCase();
				let pathSeq = FilePath.split('/');

				let currentMarker = this.root;
				// create Directories
				for(var i=0; i<pathSeq.length-1;i++)
				{
					let name = pathSeq[i];
					if(currentMarker[name]==null)currentMarker[name] = {};

					currentMarker[name]['..'] = currentMarker;
					currentMarker = currentMarker[name];
				}

				let FileName = pathSeq[i];
				
				currentMarker[FileName] = FileContent

			}

			getFileByPath(FilePath:string, RelativeTo:string=''):Uint8Array
			{
				RelativeTo = RelativeTo.toLowerCase();
				FilePath = FilePath.toLowerCase();
				let ret : Uint8Array;

				let current = this.root

				let MainDirectorySeq = FilePath.split('/');

				if(RelativeTo!='' && MainDirectorySeq[0]!='')
				{
					let pathSeq = RelativeTo.split('/');

					pathSeq.forEach(path=>
					{
						if(current[path]!=null)
						{
							if(!(current[path] instanceof Uint8Array))
								current = current[path];
						}
						else
						{
							throw 'Path Error';
						}
					});
				}

				let mainIndex = 0;

				let relName = '';
				for(var i=0; i<MainDirectorySeq.length-1; i++)
				{
					relName = MainDirectorySeq[i];
					
					if(relName!='')
					{
						if(current[relName]!=null)
						{
								current = current[relName];
						}
						else
						{
							throw 'Path Error';
						}
					}
				}
				relName = MainDirectorySeq[i];

				ret = current[relName];

				return ret;
			}
			
			getTextFileByPath(FilePath:string, RelativeTo : string=''):string
			{
				let ret = '';

				try
				{

					let FileContent = this.getFileByPath(FilePath,RelativeTo);
					
					if(FileContent!=null)
					{
						let len = FileContent.length;

						for(var i=0; i<len; i++)
							ret += String.fromCharCode(FileContent[i]);
						ret = UTF8.FromASCII(ret);
					}
					else ret = null;
					
					return ret;
				}
				catch(ex)
				{
					return null;
				}
			}

			getXMLFileByPath(FilePath:string, RelativeTo: string = ''):Document
			{
				let ret : Document;

				let txt = this.getTextFileByPath(FilePath,RelativeTo);
				if(txt!=null)
					ret = this._xmlParser.parseFromString(txt,'text/xml');

				return ret;
			}
		}

		module Parsers
		{
			export class Parser
			{
				protected _compressedStream : IO.Stream;
				constructor(stream:IO.Stream)
				{
					this._compressedStream = stream;
					this.parse();
				}
				protected parse()
				{

				}
			}

			export module File
			{
				export class FileParser extends Parser
				{
					Header:LocalFileHeader;
					FileContent : Uint8Array;
					
					toString()
					{
						return this.Header.fileName;
					}

					protected parse()
					{
						this.Header = new LocalFileHeader(this._compressedStream);

						// Creat file memory buffer
						let bufferWriter = new IO.Uint8ArrayWriter(this.Header.uncompressedSize);
						this.FileContent = bufferWriter.data;

						switch(this.Header.compressionMethod)
						{
							// Execute inflate algo
							case 8:
								let CompressedStream = new IO.Stream(this._compressedStream.ReadBytes(this.Header.compressedSize).buffer);
								try
								{
									let Inflator = new Inflate.FileParser(CompressedStream,bufferWriter);
								}
								catch(ex)
								{
									console.warn('FIQ : ',this.Header.fileName,ex);
								}
							break;

							// No compression method
							case 0:
								// Copy Data content to File content

								let lenthToCopy = this.Header.compressedSize;

								while(lenthToCopy-->0)
								{
									var byte = this._compressedStream.ReadUInt(1);
									bufferWriter.push(byte);
								}
							break;

							// Park the compressed file
							default:
								console.warn('Compression not implemented');
								let len = this.Header.compressedSize;
								while(len-->0)
								{
									let byte = this._compressedStream.ReadUInt(1);
									bufferWriter.push(byte);
								}
								this['Not_Implemented'] = true;
						}
					}
				}

				class LocalFileHeader
				{
					version:number;
					gerneral:number;
					compressionMethod:number;
					lastModTime:number;

					lastModDate:number;
					crc32:number;
					compressedSize:number;
					uncompressedSize:number;

					fileNameLength:number;
					extraFieldLength:number;

					fileName:string;
					extraField:Uint8Array;

					constructor(stream:IO.Stream)
					{
						this.version = stream.ReadUInt(2);
						this.gerneral = stream.ReadUInt(2);
						this.compressionMethod = stream.ReadUInt(2);
						this.lastModTime = stream.ReadUInt(2);
						
						this.lastModDate = stream.ReadUInt(2);
						this.crc32 = stream.ReadUInt(4);
						this.compressedSize = stream.ReadUInt(4);
						this.uncompressedSize = stream.ReadUInt(4);

						this.fileNameLength = stream.ReadUInt(2);
						this.extraFieldLength = stream.ReadUInt(2);

						this.fileName = stream.ReadString(this.fileNameLength);
						this.extraField = stream.ReadBytes(this.extraFieldLength);
					}
				}
			}

			let sigParserMap = {};
			sigParserMap[0x04034b50] = File.FileParser;

			export function getParser(sig:number, stream : IO.Stream) : Parser
			{
				let k = sigParserMap[sig];
				let ret = null as Parser;
				if(k!=null)
				{
					ret = new k(stream);
				}
				return ret;
			}
		}

		// Inlfate Algo
		module Inflate
		{
			export class FileParser
			{
				private _data : IO.Stream;
				private _out : IO.Uint8ArrayWriter;

				constructor(inStream : IO.Stream, outStreamwriter : IO.Uint8ArrayWriter)
				{
					this._data = inStream;
					this._out = outStreamwriter;
										
					while(1)
					{
						let Header = new BlockHeader(inStream);
						let Inflator = BlockInflators.getInflator(Header.CompressionType, inStream, this._out);
						
						Inflator.Uncompress();
						if(Header.lastBlock)	break;
					}

				}
			}

			class BlockHeader
			{
				lastBlock : boolean;
				CompressionType : number;
				constructor (stream : IO.Stream)
				{
					this.lastBlock = (stream.ReadBits(1)==1);
					this.CompressionType = stream.ReadBits(2);
				}
			}

			module BlockInflators
			{
				export class BlockInflator
				{
					protected _in:IO.Stream;
					protected _out:IO.Uint8ArrayWriter;

					constructor(inStream:IO.Stream, outBuffer : IO.Uint8ArrayWriter)
					{
						this._in = inStream;
						this._out = outBuffer;
					}
					Uncompress(){throw 'Class Inflator Not implemented';}
				}

				// bit Offset Data
					let _infLengthData=[
						{offsetBits:0,	baseValue:3},
						{offsetBits:0,	baseValue:4},
						{offsetBits:0,	baseValue:5},
						{offsetBits:0,	baseValue:6},
						{offsetBits:0,	baseValue:7},
						{offsetBits:0,	baseValue:8},
						{offsetBits:0,	baseValue:9},
						{offsetBits:0,	baseValue:10},
						{offsetBits:1,	baseValue:11},
						{offsetBits:1,	baseValue:13},
						{offsetBits:1,	baseValue:15},
						{offsetBits:1,	baseValue:17},
						{offsetBits:2,	baseValue:19},
						{offsetBits:2,	baseValue:23},
						{offsetBits:2,	baseValue:27},
						{offsetBits:2,	baseValue:31},
						{offsetBits:3,	baseValue:35},
						{offsetBits:3,	baseValue:43},
						{offsetBits:3,	baseValue:51},
						{offsetBits:3,	baseValue:59},
						{offsetBits:4,	baseValue:67},
						{offsetBits:4,	baseValue:83},
						{offsetBits:4,	baseValue:99},
						{offsetBits:4,	baseValue:115},
						{offsetBits:5,	baseValue:131},
						{offsetBits:5,	baseValue:163},
						{offsetBits:5,	baseValue:195},
						{offsetBits:5,	baseValue:227},
						{offsetBits:0,	baseValue:258}
					]as {offsetBits:number,baseValue:number}[];

					let _infDistData=[
						{offsetBits:0,baseValue:1},  
						{offsetBits:0,baseValue:2},  
						{offsetBits:0,baseValue:3},  
						{offsetBits:0,baseValue:4},  
						{offsetBits:1,baseValue:5}, 
						{offsetBits:1,baseValue:7}, 
						{offsetBits:2,baseValue:9},
						{offsetBits:2,baseValue:13},
						{offsetBits:3,baseValue:17},
						{offsetBits:3,baseValue:25},
						{offsetBits:4,baseValue:33}, 
						{offsetBits:4,baseValue:49}, 
						{offsetBits:5,baseValue:65}, 
						{offsetBits:5,baseValue:97},
						{offsetBits:6,baseValue:129},
						{offsetBits:6,baseValue:193},
						{offsetBits:7,baseValue:257},
						{offsetBits:7,baseValue:385},
						{offsetBits:8,baseValue:513},
						{offsetBits:8,baseValue:769},
						{offsetBits:9,baseValue:1025},
						{offsetBits:9,baseValue:1537},
						{offsetBits:10,baseValue:2049},
						{offsetBits:10,baseValue:3073},
						{offsetBits:11,baseValue:4097},
						{offsetBits:11,baseValue:6145},
						{offsetBits:12,baseValue:8193},
						{offsetBits:12,baseValue:12289},
						{offsetBits:13,baseValue:16385},
						{offsetBits:13,baseValue:24577}
					]as{offsetBits:number,baseValue:number}[];
				// End Region

				// Inf00
					class Inf00 extends BlockInflator
					{
						Uncompress()
						{
							let stream = this._in;
							let len = stream.ReadUInt(2);
							let nlen = stream.ReadUInt(2);

							if(len!=(nlen ^ 0xFFFF))
								throw 'bad data';

							this._Copy(len);
						}

						private _Copy(len : number)
						{
							while(len-->0)
							{
								var byte = this._in.ReadUInt(1);
								this._out.push(byte);
							}
						}
					}
				// End Region

				// Inf01
					let FixedHuffmanDecoder : Huffman.HuffmanDecoder;
					// Generate Fixed Huffman Code
						(function()
						{
						function getFixedHuffmanDecoder() : Huffman.HuffmanDecoder
						{
							let lens = [];
							
							let count;
							count = 143+1;
							loop(8);

							count = 255-144+1;
							loop(9);

							count = 279-256+1;
							loop(7);

							count = 287-280+1;
							loop(8);

							function loop(len:number)
							{
								while(count-->0)
									lens.push(len);
							}

							let ret = new Huffman.HuffmanDecoder();
							ret.ConstructUsingLength(lens);

							return ret;
						}
						FixedHuffmanDecoder= getFixedHuffmanDecoder();
						})();
					// End Region
					 
					class Inf01 extends BlockInflator
					{
						Uncompress()
						{
							var outStream = this._out;
							while(true)
							{
								let data=FixedHuffmanDecoder.ReadNext(this._in);

								if(data<256)
								{
									this._out.push(data);
								}
								else if(data==256)
								{
									break;
								}
								else
								{
									let self = this;

									let lengthToCopy : number;
									// read length to copy
										(function getLengthToCopy(){
											var lengthData = data-257;
											var readInfo = _infLengthData[lengthData];

											lengthToCopy = readInfo.baseValue;
											var extraBits = readInfo.offsetBits;

											if(extraBits>0)
												lengthToCopy += self._in.ReadBits(extraBits);
										})();
									// end region

									let negativeDistance : number;
									// read distance to to copy
										(function getNegativeDistance(){
											let data = self._in.ReadBits(5);
											
											let _info = _infDistData[data];
											let base = _info.baseValue;
											let offsetBits = _info.offsetBits;

											if(offsetBits>0)
												base+=self._in.ReadBits(offsetBits);
											
											negativeDistance = base;
										})();
									// end region

									//copy bytes
										(function copyBytes(){
											let actualIndex = outStream.index - negativeDistance;

											while(lengthToCopy-->0)
											{
												let byte = outStream.data[actualIndex++];
												outStream.push(byte);
											}
										})();
									// end region
								}
							}
						}
					}
				// End Region

				// Inf10
					let CodelenOrder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
			
					class Inf10 extends BlockInflator
					{
						NoOfLengthCodes:number;
						NoOfDistanceCodes:number;
						$_NoOfCodeLengthCodes:number;
						
						Uncompress()
						{
							let FirstLevelDecoder = this._GetFirstLevelHuffmanDecoder();
							let Decoders = this._InflateHuffmanResolver(FirstLevelDecoder);
							this._InflateBlockData(Decoders.LengthResolver, Decoders.DistResolver);
						}

						private _GetFirstLevelHuffmanDecoder():Huffman.HuffmanDecoder
						{
							//Make space for 0-18 lengths
							let retCodeLengths = new Array(19);
							for(var i=0; i<19; i++)retCodeLengths[i]=0;

							this.NoOfLengthCodes = this._in.ReadBits(5) + 257;
							this.NoOfDistanceCodes = this._in.ReadBits(5) + 1;
							this.$_NoOfCodeLengthCodes = this._in.ReadBits(4) + 4;

							for(var i=0; i<this.$_NoOfCodeLengthCodes; i++)
							{
								var CodeLength = this._in.ReadBits(3);
								retCodeLengths[CodelenOrder[i]] = CodeLength;
							}
							let ret = new Huffman.HuffmanDecoder();
							ret.ConstructUsingLength(retCodeLengths);
							return ret;
						}

						private _InflateHuffmanResolver(FirstLevelDecoder : Huffman.HuffmanDecoder): ({LengthResolver : Huffman.HuffmanDecoder,DistResolver:Huffman.HuffmanDecoder})
						{
							// codelength of primary table to be stored here;
							let CodeLength_lengthCodes:number[];
							let CodeDist_lengthCodes:number[];
							let lengthCodes = [] as number[];

							let HuffmanDecoder = FirstLevelDecoder;
							
							let previousCodeLength = -1;

							for(; lengthCodes.length<this.NoOfDistanceCodes+this.NoOfLengthCodes;)
							{
								HuffmanDecoder.ReadNext(this._in);

								if(HuffmanDecoder.Value>=256)
									console.warn('Tree resolved to byte overflow, extra bits trunctated.');

								let bitLength = 0;
								let repeatTimes = 0;
								let copyValue = 0;
								let doCopy=false;

								switch(HuffmanDecoder.Value)
								{
									case 16:
										bitLength = 2;
										repeatTimes = 3;
										copyValue =previousCodeLength;
										doCopy = true;
									break;

									case 17:
										bitLength = 3;
										repeatTimes = 3;
										doCopy = true;
									break;

									case 18:
										bitLength = 7;
										repeatTimes = 11;
										doCopy = true;
									break;
								}

								if(!doCopy)
								{
									// Push Codelength as is
									lengthCodes.push(HuffmanDecoder.Value);
									previousCodeLength = HuffmanDecoder.Value;
								}
								else
								{
									// Repeat Codelength based on subsequent values
									if(copyValue==-1)
										throw 'Corrupt data: repeation cannot start from first length';
									
									repeatTimes += this._in.ReadBits(bitLength);
									
									while(repeatTimes-->0)
										lengthCodes.push(copyValue);
								}
								previousCodeLength = lengthCodes[lengthCodes.length-1];
							}

							CodeLength_lengthCodes = lengthCodes.splice(0,this.NoOfLengthCodes);
							CodeDist_lengthCodes = lengthCodes;
							var LengthCodeTree = new Huffman.HuffmanDecoder()
							LengthCodeTree.ConstructUsingLength(CodeLength_lengthCodes);

							var DistCodeTree = new Huffman.HuffmanDecoder();
							DistCodeTree.ConstructUsingLength(CodeDist_lengthCodes);

							return {
								LengthResolver:LengthCodeTree,
								DistResolver:DistCodeTree
							};
						}

						private _InflateBlockData(LengthResolver : Huffman.HuffmanDecoder, DistanceResolver : Huffman.HuffmanDecoder)
						{
							var outStream = this._out;

							while(true)
							{
								var data = LengthResolver.ReadNext(this._in);

								if(data<256)
								{
									// Normal Data;
									outStream.push(data);
								}
								else if(data==256)
								{
									break;
								}
								else
								{
									let self = this;

									let lengthToCopy : number;
									// read length to copy
										(function getLengthToCopy(){
											var lengthData = data-257;
											var readInfo = _infLengthData[lengthData];

											lengthToCopy = readInfo.baseValue;
											var extraBits = readInfo.offsetBits;

											if(extraBits>0)
												lengthToCopy += self._in.ReadBits(extraBits);
										})();
									// end region

									let negativeDistance : number;
									// read distance to to copy
										(function getNegativeDistance(){
											let data = DistanceResolver.ReadNext(self._in);
											
											let _info = _infDistData[data];
											let base = _info.baseValue;
											let offsetBits = _info.offsetBits;

											if(offsetBits>0)
												base+=self._in.ReadBits(offsetBits);
											
											negativeDistance = base;
										})();
									// end region

									//copy bytes
										(function copyBytes(){
											let actualIndex = outStream.index - negativeDistance;

											while(lengthToCopy-->0)
											{
												let byte = outStream.data[actualIndex++];
												outStream.push(byte);
											}
										})();
									// end region
								}

							}
						}
					}
				// End Region
				
				// Getter of Inflator Reslover
					export function getInflator(ver:number, inStream : IO.Stream, outStream : IO.Uint8ArrayWriter) : BlockInflator
					{
						let ret : BlockInflator;
						switch(ver)
						{
							case 0:
								ret = new Inf00(inStream,outStream);
								break;

							case 1:
								ret = new Inf01(inStream,outStream);
								break;

							case 2:
								ret = new Inf10(inStream,outStream);
								break;

							default:
							console.error('Not Implemented other inflator');
						}
						return ret;
					}
				// End Region
			}			


		}

	}

	export module XLSX
	{
		export function ReadBLOB(FileBlob)
		{
			let p = new _Parser(FileBlob);
			let ret = new Workbook();
			ret.Sheets = p.$_sheets;
			return ret;
		}

		export function ReadFile(File):Async<Workbook>
		{
			let ret = new Async<Workbook>();

			var FileReader1 = new FileReader();
			FileReader1.readAsArrayBuffer(File);
			FileReader1.onloadend=function(e)
			{
				var FileBlob = FileReader1.result;
				var goAhead = false;
				let wb;
				try
				{
					wb = Lib.XLSX.ReadBLOB(FileBlob);
					goAhead=true;
				}
				catch(exp)
				{
					ret.$_cfn(exp);
				}

				if(goAhead)
				{
					setTimeout(function()
					{
						ret.$_tfn(wb);
					},0);
				}
			}

			return ret;
		}

		class Workbook
		{
			Sheets : xl.Sheet[];
		}

		class _Parser
		{
			private $_internalFS : Container.FileSystem

			$_sheets : xl.Sheet[];
			private $sst : string[];
			private dateFormatIndex : number[];
			constructor(FileBlob)
			{
				var FileStream = new IO.Stream(FileBlob);
				var Zip = new Container.Reader(FileStream);
				this.$_internalFS = Zip.FileSystem;

				this.IdentifyDateFormats();
				this.LoadSharedStrings();
				this.GetSheetsInfo();
			}

			private IdentifyDateFormats()
			{
				this.dateFormatIndex = [];
				var knownDateFmtId = [15,14,16,17,18,19,20,21,22,45,47,46];
				debugger;
				var $ifs = this.$_internalFS;
				var styles = $ifs.getXMLFileByPath('/xl/styles.xml');

				var numFormats = styles.querySelectorAll('numFmts>numFmt');
				for(var i=0; i<numFormats.length; i++)
				{
					try
					{
						var numFmt = numFormats.item(i);
						var fmtId = parseInt(numFmt.getAttribute('numFmtId'));
						var format = numFmt.getAttribute('formatCode');
						format = format.replace(/\[.+?\]/g,'');
						if(/([dmyh]|ss)/.test(format))
						{
							knownDateFmtId.push(fmtId);
						}
					}
					catch(ex)
					{

					}
				}


				var cellXfs = styles.querySelectorAll('cellXfs>xf')
				for(var i=0; i<cellXfs.length; i++)
				{
					var xf = cellXfs.item(i);
					try
					{
						var fmtId = parseInt(xf.getAttribute('numFmtId'));
						if(knownDateFmtId.indexOf(fmtId)>=0)
						{
							this.dateFormatIndex.push(i);
						}
					}
					catch(ex)
					{

					}
				}
			}

			private GetSheetsInfo()
			{
				let $FS = this.$_internalFS;

				let Workbook = $FS.getXMLFileByPath('xl/workbook.xml');
				let WorkbookRel=$FS.getXMLFileByPath('xl/_rels/workbook.xml.rels')

				let sheetData = [] as xl.Sheet[];
				this.$_sheets = sheetData;

				try
				{
					let Sheets = Workbook.querySelector('sheets').querySelectorAll('sheet');
					var len = Sheets.length;
					for(var i=0; i<len; i++)
					{
						let tempSheet = Sheets.item(i);
						
						let sheet = new xl.Sheet(tempSheet);
						

						let SheetRelation = WorkbookRel.querySelector('Relationship[Id="'+sheet.$_r_id+'"]');
						let sheetTarget = SheetRelation.getAttribute('Target');
						if(sheetTarget!=null)
						{
							sheet.$_LoadContentsFromFS($FS,this.$sst,sheetTarget, this.dateFormatIndex);
							sheetData.push(sheet);
						}
					}
				}
				catch(ex)
				{

				}
			}

			private LoadSharedStrings()
			{
				let $FS = this.$_internalFS;
				let SST = $FS.getXMLFileByPath('xl/sharedStrings.xml');
				if(SST!=null)
				{
					let ssts = SST.querySelector('sst').querySelectorAll('si');
					let len = ssts.length;
					this.$sst = [];

					for(var i=0; i<len; i++)
					{
						let si = ssts.item(i);
						let t = si.querySelectorAll('t');
						if(t==null || t.length==0)
							throw 'T not found inside si of sst, see SharedStrings.xml index, ' + i;

						let acs = '';

						for(var j=0; j<t.length; j++)
						{
							acs+=t[j].textContent;
						}
						acs = UTF8.FromASCII(acs);
						this.$sst.push(acs);
					}
				}
				else
					this.$sst=[];
			}
		}

		module xl
		{	
			let MonthlyDaysCount = [0,31,28,31,30,31,30,31,31,30,31,30,31];
			let isXLLeap = function(yr){return (yr%4==0&&yr%100!=0)||(yr%100==0&&yr%400==0)||(yr==1900)};

			function getXLDate(val:number):Date
			{
				let r : Date;
				
				let day = 0;
				let mth = 1;
				let yr = 1900;
				let hr = 0;
				let min = 0;
				let sec = 0;
				let mili = 0;

				let absD = Math.floor(val);

				while(val>0)
				{
					let yrlyDays = 365;
					if(isXLLeap(yr))yrlyDays+=1;

					if(val>yrlyDays)
					{
						val-=yrlyDays;
						yr++;
					}
					else
					{
						let needDays = MonthlyDaysCount[mth];
						if(mth==2)if(isXLLeap(yr))needDays++;

						if(val>needDays)
						{
							val-=needDays;
							mth++;

							if(mth>12)
							{
								mth=1;
								yr++;
							}
						}
						else
						{
							day = val;
							val=0;
						}	
					}			
				}

				r = new Date(yr,mth-1,day,hr,min,sec,mili);
				return r;
			}

			function getXLTime(val:number):Date
			{
				let r = getXLDate(val);

				let frac = val-Math.floor(val);
				let totalSecs = 60*60*24;

				let secsToCount = Math.floor(totalSecs*frac);
				
				let hr = Math.floor(secsToCount/3600);
				secsToCount -= hr*3600;

				let min = Math.floor(secsToCount/60);
				secsToCount -= min*60;

				let secs = secsToCount;

				r.setHours(hr);
				r.setMinutes(min);
				r.setSeconds(secs);

				return r;
			}

			let base26 = ['/'];
			let Acode = 'A'.charCodeAt(0);
			for(var i=0;i<26;i++)
			{
				base26.push(String.fromCharCode(Acode + i));
			}

			function xlColAlphaToNumeric(val : string):number
			{
				let ret = 0;

				for(var i=0; i<val.length;i++)
				{
					let digit = val.charAt(i);
					let decimalVal = base26.indexOf(digit);
					ret*=(base26.length-1);
					ret+=decimalVal;
				}
				return ret-1;
			}

			let AlphaFilter = /(\D+)/;
			let NumericFilter = /(\d+)/;

			let intFilter = /\d+/;
			let floatFilter = /\d*\.\d+/;

			export class Sheet
			{
				Name:string;

				$_sheetId : number;
				$_r_id:string;

				rows:{cells:{c:number,v:string,R1D1:string,hyperlink:string,getDate:()=>Date}[],rowNo:number}[];
				drawings:{File:Uint8Array, From:{row:number,col:number}, To:{row:number,col:number}}[];

				private $_sheetML : Document;
				private $_sheetRelML : Document;
				private $_ifs : Container.FileSystem;
				private $_sst : string[];
				private $_dfid : number[];

				constructor(sheet : Element)
				{
					this.Name = sheet.getAttribute('name');
					this.$_sheetId = parseInt(sheet.getAttribute('sheetId'));
					this.$_r_id = sheet.getAttribute('r:id');
				}
				
				$_LoadContentsFromFS($FS : Container.FileSystem, $sst : string[], sheetPath : string, knownDateFormatIds:number[])
				{
					this.$_ifs = $FS;
					this.$_sst = $sst;
					this.$_dfid = knownDateFormatIds;
					
					let pos = 'xl/worksheets';
					let sheetXML = $FS.getXMLFileByPath(sheetPath, 'xl');
					this.$_sheetML = sheetXML;
					
					let sheetNames = sheetPath.split('/');
					sheetNames.splice(sheetNames.length-1,0,'_rels');
					sheetNames[sheetNames.length-1] += '.rels';
					let relPath = sheetNames.join('/');
					
					this.$_sheetRelML = $FS.getXMLFileByPath(relPath,'xl');
					
					this._LoadCells();
					this._LoadDrawings();
					this._LoadHyperLinks();
				}

				private _LoadCells()
				{
					let sheetXML : Document = this.$_sheetML;
					let $FS:Container.FileSystem = this.$_ifs;
					let $sst: string[] = this.$_sst;
					let $dfid = this.$_dfid;

					this.rows = [];

					let rows = sheetXML.querySelectorAll('worksheet>sheetData>row');
					let len = rows.length;

					for(var i=0; i<len; i++)
					{
						let row = rows.item(i);
						let rowNumber = parseInt(row.getAttribute('r'));

						let rowCells = [];
						let nullCells = [];
						let cells = row.querySelectorAll('c');

						let len2 = cells.length;
						for(var j=0; j<len2; j++)
						{
							let cell = cells.item(j);
							let cellposition = cell.getAttribute('r');
							let cellValue;
							try
							{
								let tc = cell.querySelector('v');
								if(tc!=null)
								{
									let sstRef = 0;
									if(intFilter.test(tc.textContent))
										sstRef = parseInt(tc.textContent);
									if(floatFilter.test(tc.textContent))
										sstRef = parseFloat(tc.textContent);

									let tType = cell.getAttribute('t');
									let sType = cell.getAttribute('s');

									if(tType!=null && tType=='s')
									{
										if(sstRef!=null)
										{
											cellValue = $sst[sstRef];
										}
									}
									else if(sType!=null)
									{
										cellValue = (sstRef);
										try
										{
											var sTypeI = parseInt(sType);
											if(sTypeI!=0)
											{
												cellValue = sstRef;
												if($dfid.indexOf(sTypeI)>=0)
												{
													cellValue = getXLTime(cellValue);
												}
											}
										}
										catch(ex)
										{
											cellValue = sstRef;
										}
									}
									else
									{
										cellValue = sstRef;
									}
								}
								else
								{
									cellValue = null;
								}
							}
							catch(exp)
							{
								console.warn(exp);
							}

							let columnAlphaBet = AlphaFilter.exec(cellposition)[1];
							let columnNumber = xlColAlphaToNumeric(columnAlphaBet);

							let cellObj = {} as any;
							cellObj.c = columnNumber;
							cellObj.v = cellValue;
							cellObj.R1D1 = cellposition;
							cellObj.getDate = function(){return getXLDate(parseInt(this.v))}
							cellObj.getDateTime = function(){return getXLTime(parseFloat(this.v))}

							if(cellValue==null)
							{
								nullCells.push(cellObj);
							}
							else
							{
								while(nullCells.length>0)
									rowCells.push(nullCells.splice(0,1)[0]);
									
								rowCells.push(cellObj);
							}
						}
						rowCells = rowCells.sort((a:{c:number},b:{c:number})=>{
							if(a.c<b.c)return -1;
							else if(a.c>b.c) return 1;
							return 0;
						});

						this.rows.push({cells:rowCells, rowNo:rowNumber});
					}
					this.rows = this.rows.sort((a:{rowNo:number},b:{rowNo:number})=>
					{
						if(a.rowNo<b.rowNo)return -1;
						else if(a.rowNo>b.rowNo)return 1;
						return 0;
					});
				}

				private _LoadDrawings()
				{
					let pos = 'xl/worksheets';
					let sheetXML:Document = this.$_sheetML;
					let $FS:Container.FileSystem = this.$_ifs;

					this.drawings = [];
					let drawing = sheetXML.querySelector('drawing');
					if(drawing!=null)
					{
						let relationId = drawing.getAttribute('r:id');

						let sheetRelXML = this.$_sheetRelML;
						if(sheetRelXML!=null)
						{
							let allRels = sheetRelXML.querySelectorAll('Relationship');

							let len = allRels.length;

							let drawingRelative : Element;

							while(len-->0)
								if(allRels[len].getAttribute('Id')==relationId)
									{
										drawingRelative = allRels[len];
										break;
									}

							let target = drawingRelative.getAttribute('Target');

							let drawingDefXML = $FS.getXMLFileByPath(target,pos);
							
							let targets = target.split('/');
							targets.splice(targets.length-1,0,'_rels');
							targets[targets.length-1] += '.rels';
							let relPath = targets.join('/');

							let drawingRelXML = $FS.getXMLFileByPath(relPath,pos);
							let imageRelations = drawingRelXML.querySelectorAll('Relationship');

							let allAnchors = drawingDefXML.querySelectorAll('twoCellAnchor');

							len = allAnchors.length;
							for(var i=0; i<len; i++)
							{
								let anchor = allAnchors.item(i);

								try
								{
									let fromData = anchor.querySelector('from');
									let toData = anchor.querySelector('to');
									let picData = anchor.querySelector('pic');

									let from:{row:number,col:number} = 
									{
										row: parseInt(fromData.querySelector('row').textContent),
										col: parseInt(fromData.querySelector('col').textContent)
									};

									let to:{row:number,col:number} = 
									{
										row: parseInt(toData.querySelector('row').textContent),
										col: parseInt(toData.querySelector('col').textContent)
									};

									let ImgRelId = picData.querySelector('blipFill>blip').getAttribute('r:embed');

									let ImageRefPath : string;
									
									for(var j=0; j<imageRelations.length;j++)
									{
										let imgRel = imageRelations.item(j);
										if(imgRel.getAttribute('Id')==ImgRelId)
										{
											ImageRefPath = imgRel.getAttribute('Target');
											break;
										}
									}

									if(ImageRefPath!=null)
									{
										//Get and Attach Image;
										let ImageFile = $FS.getFileByPath(ImageRefPath,pos);
										let ImageData = {
											File:ImageFile,
											From:from,
											To:to
										};

										this.drawings.push(ImageData);
									}
									
								}
								catch(exp)
								{
									console.warn('Error while reading drawing xml',exp);
								}
							}


						}
					}
				}

				private _LoadHyperLinks()
				{
					let allLinkRels = this.$_sheetML.querySelectorAll('hyperlinks>hyperlink');
					for(var i=0; i<allLinkRels.length; i++)
					{
						try
						{
							let linkRel = allLinkRels.item(i);

							let R1D1 = linkRel.getAttribute('ref');
							let linkRelation = linkRel.getAttribute('r:id');

							let relatedData = this.$_sheetRelML.querySelector('Relationships>Relationship[Id="'+linkRelation+'"]');
							
							let type = relatedData.getAttribute('Type');
							let target = relatedData.getAttribute('Target');

							if(type=='http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink'&&target!=null&&target!='')
							{
								let link = target;
								let RowNumber = parseInt(NumericFilter.exec(R1D1)[1]);
								let ColAlpha = AlphaFilter.exec(R1D1)[1];
								let ColNum = xlColAlphaToNumeric(ColAlpha);

								let rowIndex = RowNumber;
								while(this.rows[rowIndex].rowNo != RowNumber && rowIndex>=0) rowIndex--;
								if(this.rows[rowIndex].rowNo!=RowNumber)
									throw 'RowNumber not found';

								let cells = this.rows[rowIndex].cells;

								let cellIndex = ColNum;

								while(cells[cellIndex].c != ColNum && cellIndex>=0) cellIndex--;
								if(cells[cellIndex].c != ColNum)throw 'Cellnumber not found';

								cells[cellIndex].hyperlink = link;
							}
						}
						catch(ex)
						{
							// console.warn('HIQ : ', this.Name + ' i ' + i + " : ",ex);
						}						
					}
				}
			}
		}
	}
}

var file = document.createElement('input');
file.type = 'file';


var btn = document.createElement('input');
btn.type = 'button';

document.body.appendChild(file);
document.body.appendChild(btn);

btn.onclick = function()
{
	if(file.files.length>0)
	{
		Lib.XLSX.ReadFile(file.files.item(0))
		.then(function(wb)
		{
			debugger;
		})

		.catch(function(ex)
		{
			debugger;
		});
	}
}

