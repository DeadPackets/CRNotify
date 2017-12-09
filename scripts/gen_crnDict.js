#!/usr/bin/env node

//I love this library so damn much
const cheerio = require('cheerio')


//Stolen from banner
const data = `
<option value="ACC">Accounting</option>
<option value="ASE">Aerospace Engineering</option>
<option value="ANT">Anthropology</option>
<option value="ARA">Arabic Language _ Literature</option>
<option value="ARC">Architecture</option>
<option value="ART">Art and Art History</option>
<option value="BIO">Biology</option>
<option value="BME">Biomedical Engineering</option>
<option value="BIS">Business Information Systems</option>
<option value="BLW">Business Legal Issues</option>
<option value="CHE">Chemical Engineering</option>
<option value="CHM">Chemistry</option>
<option value="CVE">Civil Engineering</option>
<option value="COE">Computer Engineering</option>
<option value="CMP">Computer Science</option>
<option value="DES">Design</option>
<option value="ECO">Economics</option>
<option value="ELE">Electrical Engineering</option>
<option value="NGN">Engineering</option>
<option value="EGM">Engineering Management</option>
<option value="ESM">Engineering Systems/Management</option>
<option value="ENG">English Language</option>
<option value="ELP">English Language Preparation</option>
<option value="ELT">English Language Teaching</option>
<option value="ENV">Environmental Sciences</option>
<option value="EWE">Environmental and Water Eng'g</option>
<option value="FLM">Film</option>
<option value="FIN">Finance</option>
<option value="GEO">Geography</option>
<option value="HIS">History</option>
<option value="INE">Industrial Engineering</option>
<option value="IDE">Interior Design</option>
<option value="INS">International Studies</option>
<option value="MGT">Management</option>
<option value="MIS">Management Information Systems</option>
<option value="MKT">Marketing</option>
<option value="MCM">Mass Communication</option>
<option value="MBA">Master of Business Admin</option>
<option value="MTH">Math</option>
<option value="MCE">Mechanical Engineering</option>
<option value="MTR">Mechatronics</option>
<option value="MUM">Multimedia</option>
<option value="MUS">Music</option>
<option value="PET">Petroleum Engineering</option>
<option value="PHI">Philosophy</option>
<option value="PHY">Physics</option>
<option value="POL">Political Science</option>
<option value="MBAP">Pre-MBA</option>
<option value="PSY">Psychology</option>
<option value="QBA">Quantitative Business Analysis</option>
<option value="SOC">Sociology</option>
<option value="STA">Statistics</option>
<option value="ABRD">Study Abroad Credit(s)</option>
<option value="SCM">Supply Chain Management</option>
<option value="THE">Theatre</option>
<option value="TRA">Translation</option>
<option value="UPA">University Preparation</option>
<option value="UPL">Urban Planning</option>
<option value="VIS">Visual Communication</option>
<option value="WST">Women Studies</option>
<option value="WRI">Writing Studies</option>`


//Load data
const $ = cheerio.load(data)


//Init json result
var json = {}


//Loop through every <option> tag
$('option').each(function(i, item){

   //Grab the values we need
   const key = $(item).text().toLowerCase()
   const val = $(item).attr('value')


   //Append them to the json result
   json[key] = val;
})


//Output JSON result
console.log(JSON.stringify(json))


//Boom. The power of Javascript.
