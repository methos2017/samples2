/*

    Класс JsonToFirecloud

    @GetData - забираем данные из json
    @InsertIntoFirecloud - вставляем данные в FireCloud
    @DeleteAllDataFirecloud - удалчем все данные из Firecloud

*/

const path = require('path')

let request = require('request')

const sharp = require('sharp')

let fs = require('fs')

const argv = require('minimist')(process.argv.slice(2))
let files = argv.files
let dbAlgolia = argv.dbAlgolia
let dbFirestore = argv.dbFirestore
let imagesBox = argv.imagesBox
let imagesComps = argv.imagesComps
let imagesDetail = argv.imagesDetail

const ConvertNom = require(path.resolve('./convertNom.js'))

const ParserOne = require(path.resolve('./ParserOne.js'))

const admin = require('firebase-admin')

let serviceAccount = require(path.resolve('./ServiceAccount2.json'))

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

let db = admin.firestore()

class convertJSON {
  //  Свойства
  constructor () {
    //  class init

    //  Algolia init
    this.algoliasearch = require('algoliasearch')
    this.client = this.algoliasearch(
      'M5G4SRCZWZ',
      'a05d3748d76df5498fb209dc82fb3488'
    )
    this.index = this.client.initIndex('mainCats')

    this.path = require('path').dirname(require.main.filename)

    this.counAlgolia = 0

    this.compForDB = []
    this.compForDBCounter = 0

    this.path = require('path').dirname(require.main.filename)

    //  getFTP
    if (files) {
      this.connectSftp()
    }

    this.getNom()
    this.getProds()

    // this.connectSftp()
  }

  getNom (sftp) {
    console.log('sftp: ')
    let convNom = new ConvertNom(db, sftp)
    //  call to Father
    this.allCats = convNom.globalGuid
    this.fatherData = convNom.data
    this.globalData = convNom.globalData

    this.fatherMaxValue = Object.keys(this.globalData).length
  }

  async getProds () {
    this.getJSON()
    this.parserOne = new ParserOne(this.json, this.globalData)
    this.globalObj = this.parserOne.globalObj4

    await this.addToDb2()
  }

  async connectSftp () {
    let Client = require('ssh2-sftp-client')
    let sftp = new Client()

    sftp
      .connect({
        host: '185.105.225.230',
        // port: '8080',
        username: 'ftp_1c',
        password: 'e01qxIeRDqNld8uH'
      })
      .then(() => {
        return sftp.list('/var/www/fastuser/data/www/bwtbarrier.ru')
      })
      .then(data => {
        // console.log(data, 'the data info')
      })
      .then(data => {
        sftp
          .get('/var/www/fastuser/data/www/bwtbarrier.ru/НоменклатураJSON.txt')
          .then(stream => {
            this.getNom(sftp)
            // console.log(stream)
            stream
              .pipe(
                fs.createWriteStream(path.resolve('./НоменклатураJSON.txt'))
              )
              .on('finish', () => {
                console.log('Finish downloading file')

                //  конструктор

                this.getProds()

                sftp.end()
              })
          })
        // .then(() => {})
      })
      .catch(err => {
        console.log(err, 'catch error')
      })
  }

  sayHello () {
    // console.log('Greetings twice!')
  }
  getParts (value, allNom, j) {
    let newComp = []
    let altComp = []

    let secondComp = []

    let resourceTemp = {}

    for (let i = 0; i < Object.keys(value.comp).length; i++) {
      let localGuid = value.comp[i]['GUID']

      let quantity = value.comp[i]['Количество']

      console.log('Welcome to getParts ' + localGuid + ' ' + quantity)

      allNom[localGuid].type = value.type

      if (value.type === 'pitcher') {
        // console.log(localGuid)
        this.pitcherLibrary(
          allNom[localGuid].name,
          allNom[localGuid].codeNomGroup,
          value.name
        )
      } else if (value.type === 'filtr') {
        console.log(
          'the name of filtrElement is: ' +
            allNom[localGuid].name +
            '\nThe father name is: ' +
            value.name
        )

        if (i === 0 || allNom[localGuid].resource[0][1] < resourceTemp[0][1]) {
          resourceTemp = allNom[localGuid].resource
        }
      }

      // в цикле
      if (quantity !== undefined) newComp.push(allNom[localGuid])
      else altComp.push(allNom[localGuid])

      if (allNom[localGuid].perspectivaFront && imagesComps) {
        this.getImages(
          allNom[localGuid].perspectivaFront,
          allNom[localGuid].guid,
          'comps',
          j
        )

        // setTimeout(() => {
        //   this.getImages(allNom[localGuid].perspectivaFront, allNom[localGuid].guid, 'comps', j)
        // }, 1000)
      }
    }

    // console.log(newComp)

    value.comp = newComp
    value.altComp = altComp

    //  минимальный ресурс
    value.comp_min = resourceTemp

    console.log('the min resource is: ' + JSON.stringify(value.comp_min))

    return value
  }

  pitcherLibrary (name, nomGroup, pitcherName) {
    // console.log(name + ' ' + nomGroup + ' Кувшин: ' + pitcherName)
    this.library[nomGroup] = { [nomGroup]: name }
  }

  saveToImages (filename, guid, mode) {
    console.log('Saving..' + filename)

    filename =
      "\n'" +
      guid +
      "': {\n\n\t" +
      mode +
      ":require('./assets/images/" +
      mode +
      '/' +
      guid +
      ".png')\n\n },"

    fs.appendFile('../bwf/images_' + mode + '.js', filename, function (err) {
      if (err) throw err
      console.log('Saved!')
    })
  }

  async download (uri, filename, callback, guid, mode) {
    console.log('the uri is..' + uri)

    try {
      let localReq = await request.head(uri, async function (err, res, body) {
        console.log('content-type:', res.headers['content-type'])
        console.log(
          'the uri is: ' + uri + 'content-length:',
          res.headers['content-length']
        )

        this.contLength = res.headers['content-length']

        // if (this.contLength) {
        await request(uri)
          .pipe(sharp().resize(390))
          .pipe(fs.createWriteStream(filename))
          .on('finish', function () {
            // console.log('the uri is: ')
            // sharp(filename).resize(200)
          })
        // }
      })
      console.log('local req: ' + JSON.stringify(localReq))

      console.log('the length is: ' + this.contLength)

      // if (this.contLength)

      this.saveToImages(filename, guid, mode)
    } catch (error) {
      console.log(error)
    }
  }

  checkEncodeURI (str) {
    return /%/i.test(str)
  }

  async getImages (img, guid, mode, j) {
    let textForFileStart = 'const images_' + mode + ' = {'

    if (j === 0) {
      fs.writeFile('../bwf/images_' + mode + '.js', textForFileStart, function (
        err
      ) {
        if (err) {
          return console.log(err)
        }

        console.log('The file was saved!')
      })
    }

    let amazonPath =
      'https://s3.eu-central-1.amazonaws.com/ru.bwtbarrier.imagestorage/public/'

    if (img) {
      img.replace('/public', '/342x/public')

      let finalName = img.split('/')

      console.log(
        'the last name is ' +
          finalName[5] +
          ' ' +
          this.checkEncodeURI(finalName[5])
      )

      let lastName = this.checkEncodeURI(finalName[5])
        ? finalName[4] + '/' + finalName[5]
        : encodeURIComponent(finalName[4] + '/' + finalName[5])

      // let lastName = encodeURIComponent(finalName[4] + '/' + finalName[5])

      await this.download(
        amazonPath + lastName,
        '../bwf/assets/images/' + mode + '/' + guid + '.png',
        function () {
          console.log('done')
        },
        guid,
        mode
      )
    }
    console.log('the j is : ' + j + 'and the fatherMax: ' + this.fatherMaxValue)
    if (j === Object.keys(this.fatherMaxValue).length) {
      let textForFileEnd = '}\nexport { images_' + mode + ' }'

      fs.appendFile('../bwf/images_' + mode + '.js', textForFileEnd, function (
        err
      ) {
        if (err) throw err
        console.log('Saved!')
      })
    }
  }

  addToDb2 () {
    let dataAlgolia = []

    let j = 0

    this.library = []

    let maxValue = Object.keys(this.parserOne.globalObj4).length

    // create image files

    for (let i = 0; i < maxValue; i++) {
      let curGroup = Object.keys(this.parserOne.globalObj4[i])[0]
      let guid = Object.keys(this.parserOne.globalObj4[i][curGroup])[0]

      let value = this.parserOne.globalObj4[i][curGroup][guid]
      let allNom = this.parserOne.globalObj5

      // забираем комплектующие
      if (value.comp) {
        value = this.getParts(value, allNom, j)
      }

      let masterArt = value.masterArt

      let codeNomGroup = value.codeNomGroup

      let perspectivaFront = value.perspectivaFront
      let perspeciveAlt1 = value.perspeciveAlt1

      let perspeciveBox = value.perspeciveBox

      if (value.masterArt && imagesBox) {
        this.getImages(value.perspeciveBox, guid, 'box', j)
      } else if (value.masterArt && imagesDetail) {
        this.getImages(perspectivaFront, guid, 'front', j)
        j++
      }

      if (masterArt === true) {
        //  write to Algolia
        dataAlgolia.push({
          masterArt: this.globalData[codeNomGroup].globalImg,
          name: this.globalData[codeNomGroup].gNameForMobile,
          resource: value.type === 'pitcher' ? value.resource : value.comp_min,
          type: value.type,
          comp: value.comp,
          altComp: value.altComp,
          perspectivaFront: perspectivaFront,
          perspeciveAlt1: perspeciveAlt1,
          perspectiveBox: perspeciveBox,
          perspectiveBoxRec: perspeciveBox
            ? "require('../../../assets/images/box/" +
              perspeciveBox.split('/').pop() +
              "')"
            : undefined
        })
      }

      // if (value.comp) {
      dbFirestore
        ? db
          .collection('products8')
        // .collection('products7')
          .doc(value.guid)
          .set(value)
        : null
      // }
    }
    dbAlgolia ? this.addToAlgolia(dataAlgolia) : null
  }

  //  Получение даннных
  async getJSON () {
    let fs = require('fs')
    this.json = JSON.parse(
      fs
        .readFileSync(
          // "/Users/admin/Desktop/barrier-connected-rn/json/packageutf8.json",
          // this.path + '/json/5/documenticonv.json'
          this.path + '/НоменклатураJSON.txt'
          // 'utf8'
        )
        .toString('utf8')
        .replace(/^\uFEFF/, '')
        .replace('#value', 'value')
    )
    // console.log(this.json)
  }

  findElement (value, mas) {
    let resultVal

    for (let i = 0; i < mas.length; i++) {
      if (mas[i]['Наименование'] === value) {
        resultVal = mas[i]['Значение']
      }
    }

    if (resultVal) return resultVal
    else return 0
  }

  addToAlgolia (data) {
    //  kill 'em all before
    this.index.clearIndex()
    setTimeout(
      arg => {
        this.index.addObjects(data, function (err, content) {
          if (err) {
            console.error(err)
          } else console.log(arg)
        })
      },
      1500,
      'data inserted to algolia'
    )
  }

  parseJSON2 () {
    for (let i = 0; i < 500; i++) {
      // for (let i = 0; i < Object.keys(this.json.value).length; i++) {

      //  создаем объект
      this.parserOne = new ParserOne(this.json, this.globalData, i)

      //  добавляем в БД, если стоит флаг
    }
  }
}

let startJSON = new convertJSON()
