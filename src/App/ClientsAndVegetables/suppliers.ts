import costco from "../../assets/images/costco-wholesale.svg"
import dpro from "../../assets/images/DPro.png"
import loblaws from "../../assets/images/loblaws.svg"
import metro from "../../assets/images/metro-inc-logo.svg"
import sobeys from "../../assets/images/sobeys-logo.svg"
import maxland from "../../assets/images/MaxLand.png"
import RoyalAlpha from "../../assets/images/royal_alpha.png"
import westernHarvest from "../../assets/images/western_harvest.webp"
import burnacProduce from "../../assets/images/burnac_produce.png"
import royaltyProduce from "../../assets/images/royalty_produce.png"
import thomas from "../../assets/images/thomas.png"
import yvan from "../../assets/images/yvan_perreault.png"
import jardinsCousineau from "../../assets/images/jardins_cousineau.png"
import trisonFarms from "../../assets/images/trison_farms.png"
import beauvais from "../../assets/images/beauvais.png"
import eagle from "../../assets/images/eagle.png"
import bono from "../../assets/images/bono.png"
import michelriendeau from "../../assets/images/michelriendeau.webp"
import global from "../../assets/images/global.png"
import jardinsagripro from "../../assets/images/jardinsagripro.png"
import fms from "../../assets/images/FMS.svg"
import samifruits from "../../assets/images/samifruits.png"
import masetfils from "../../assets/images/masetfils.png"
import patterson from "../../assets/images/patterson_produce.jpg"

export const suppliers = [
  { id: 2, name: "Costco", logo: costco },
  { id: 5, name: "Sobeys", logo: sobeys },
  { id: 6, name: "Loblaws", logo: loblaws },
  { id: 3, name: "DPro", logo: dpro },
  { id: 4, name: "Metro", logo: metro },
  { id: 7, name: "Maxland", logo: maxland },
  { id: 8, name: "Royal Alpha", logo: RoyalAlpha },
  { id: 9, name: "Western Harvest", logo: westernHarvest },
  { id: 10, name: "Burnac Produce", logo: burnacProduce },
  { id: 11, name: "Thomas Fruits et Legumes", logo: thomas },
  { id: 12, name: "Yvan Perreault et fils", logo: yvan },
  { id: 13, name: "Trison Farms", logo: trisonFarms },
  { id: 14, name: "Royalty Produce", logo: royaltyProduce },
  { id: 15, name: "Jardins Cousineau", logo: jardinsCousineau },
  { id: 16, name: "Beauvais ltée", logo: beauvais },
  { id: 17, name: "Eagle", logo: eagle },
  { id: 18, name: "Les fermes Michel Riendeau", logo: michelriendeau },
  { id: 19, name: "Bono fruits et légumes", logo: bono },
  { id: 20, name: "Global Produce", logo: global },
  { id: 21, name: "Jardins AgriPro", logo: jardinsagripro },
  { id: 22, name: "FMS", logo: fms },
  { id: 23, name: "Samifruits", logo: samifruits },
  { id: 24, name: "Mas et fils", logo: masetfils },
  { id: 25, name: "Patterson produce", logo: patterson },
] as const

const rfqSupplierNames = new Set(["Loblaws", "Metro", "Sobeys"])

export const rfqSuppliers = suppliers.filter(({ name }) => rfqSupplierNames.has(name))
