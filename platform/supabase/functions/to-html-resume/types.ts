export interface HtmlDealData {
  /* Genere el DealData viendo el Docx y el orden que se utilizan como referencia para hacer el template.
  LEMAD es la marca utilizada por Xending, asi que intuyo que es todo estatico, lo demas dinamico. */
// ------------
  buyCurrency: string;
  buyAmount: string;
  financingTerm: string;
  exchangeRate: string
  clientName: string;
  payAmount: string; // buyAmount * exchangeRate
  currency: string;
  valueDate: string;
  amountToReceive: string;
  beneficiary: string;
  bankName: string;
  clabe: string;
  reference: string;
  dealNumber: string;
  clientAddress: string;
  payCurrency: string;
  myBankName: string; //Datos de cuenta de LEMAD
  myClabe: string; //Banco de LEMAD, todo esto no es estatico realmente pero tendria que ver en donde esta en la base.
  myPaymentMethod: string;
}
