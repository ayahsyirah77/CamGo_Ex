export interface MedicalChargeItem {
  name: string;
  charge: string;
  note?: string;
}

export interface MedicalChargeGroup {
  id: string;
  title: string;
  subtitle?: string;
  items: MedicalChargeItem[];
}

export interface MedicalChargeSchedule {
  id: 'FA' | 'FB' | 'FC' | 'CARDIO';
  code: string;
  titleEn: string;
  titleBm: string;
  groups: MedicalChargeGroup[];
}

export const FOREIGNER_MEDICAL_SCHEDULES: MedicalChargeSchedule[] = [
  {
    id: 'FA',
    code: 'Schedule FA',
    titleEn: 'Outpatient Charges',
    titleBm: 'Caj Pesakit Luar',
    groups: [
      {
        id: 'fa-general',
        title: 'i) General treatment',
        items: [
          { name: 'Outpatient treatment', charge: 'RM 40' },
          { name: 'X-Ray services', charge: 'RM 15' },
          { name: 'X-Ray services (single projection)', charge: 'RM 40' },
          { name: 'Child health services', charge: 'RM 40' },
          { name: 'Obstetric & Gynaecology treatment', charge: 'RM 40' },
          { name: 'Post natal services', charge: 'RM 40' },
          { name: 'Other form of Immunisation services', charge: 'RM 40' },
          { name: 'Immunisation services for adults (on request)', charge: 'RM 100' },
          { name: 'Yellow fever immunisation', charge: 'RM 300' },
          { name: 'Typhoid immunisation', charge: 'RM 80' },
        ],
      },
      {
        id: 'fa-specialist',
        title: 'ii) Specialist treatment',
        subtitle: 'Outpatient specialist treatment (consultation and medication only; excluding investigations)',
        items: [
          { name: 'Outpatient specialist treatment — a) first visit', charge: 'RM 120' },
          { name: 'Outpatient specialist treatment — b) follow-up visit', charge: 'RM 120' },
          { name: 'Obstetric & Gynaecology treatment', charge: 'RM 15' },
          { name: 'Accident & emergency treatment', charge: 'RM 100' },
        ],
      },
    ],
  },
  {
    id: 'FB',
    code: 'Schedule FB',
    titleEn: 'Hospital Charges',
    titleBm: 'Caj Hospital',
    groups: [
      {
        id: 'fb-ward',
        title: 'i) Ward charges',
        items: [
          { name: '1 bedded room', charge: 'RM 320 per day' },
          { name: '2 bedded room', charge: 'RM 240 per day' },
          { name: '3 bedded room and more', charge: 'RM 200 per day' },
          { name: 'Labour room', charge: 'RM 300 per entry' },
          { name: 'Second Class', charge: 'RM 180 per day' },
          { name: 'Third Class', charge: 'RM 160 per day' },
        ],
      },
      {
        id: 'fb-delivery',
        title: 'ii) Delivery Charges',
        items: [
          { name: 'Normal delivery', charge: 'RM 2,593' },
          { name: 'Caesarean', charge: 'RM 3,021' },
          { name: 'Twins', charge: 'RM 2,593' },
          { name: 'Forceps, vacuum or breech', charge: 'RM 2,593' },
        ],
      },
      {
        id: 'fb-procedures',
        title: 'iii) Treatment or procedure charges',
        items: [
          { name: 'Dialysis Treatment', charge: 'RM 120' },
          { name: 'Intermittent peritoneal dialysis', charge: 'RM 300' },
          { name: 'Mammography', charge: 'RM 295' },
          { name: 'Pap smears', charge: 'RM 15' },
          { name: 'Ultrasound', charge: 'RM 100' },
          { name: 'Electrocardiogram (ECG) with report', charge: 'RM 80' },
          { name: 'Echocardiography', charge: 'RM 30' },
          { name: 'Echocardiogram', charge: 'RM 200' },
          { name: 'Echocardiogram transthoracic', charge: 'RM 230' },
          { name: 'Cardiotograph', charge: 'RM 120' },
          { name: 'Incision & Drainage', charge: 'RM 275' },
        ],
      },
      {
        id: 'fb-radiotherapy',
        title: 'iv) Radiotherapy charges',
        items: [
          { name: 'Radical Radiotherapy', charge: 'RM 3,000' },
          { name: 'Brachytherapy (High dose rate)', charge: 'RM 3,000' },
          { name: 'Brachytherapy (Low dose rate)', charge: 'RM 2,000' },
          { name: 'CT Simulation - Normal (without contrast)', charge: 'RM 1,500' },
          { name: 'CT Simulation - Complex (with contrast)', charge: 'RM 3,000' },
          { name: 'Stereotactic Radiosurgery (SRT) per fraction', charge: 'RM 500' },
          { name: 'IMRT / Rapid Arc per fraction', charge: 'RM 500' },
          { name: 'Iodine - 131 therapy (not Iodine scan) per session', charge: 'RM 800' },
        ],
      },
    ],
  },
  {
    id: 'FC',
    code: 'Schedule FC',
    titleEn: 'Dental, T&CM & Radiotherapy',
    titleBm: 'Caj Rawatan Pergigian & Perubatan Tradisional',
    groups: [
      {
        id: 'fc-general-dental',
        title: 'General Dental & Orthodontic',
        items: [
          { name: 'Registration', charge: 'RM 2' },
          { name: 'Intra oral X-ray — a) Per X-ray periapical / bite wing', charge: 'RM 10' },
          { name: 'Intra oral X-ray — b) Per occlusal X-ray', charge: 'RM 15' },
          { name: 'Temporary filling per tooth', charge: 'RM 15' },
          { name: 'Extraction per tooth', charge: 'RM 20 – 25' },
          { name: 'Filling per tooth', charge: 'RM 15 – 35' },
          { name: 'Whole mouth scaling', charge: 'RM 35' },
          { name: 'Endodontic treatment per tooth', charge: 'RM 50 – 500' },
          { name: 'Minor oral surgery', charge: 'RM 80 – 200' },
          { name: 'Soft tissue injuries', charge: 'RM 25' },
          { name: 'Orthodontic — Fixed appliances', charge: 'RM 4,000' },
          { name: 'Orthodontic — Removable appliances', charge: 'RM 2,500' },
        ],
      },
      {
        id: 'fc-specialist-dental',
        title: 'Dental specialist outpatient charges',
        items: [
          { name: 'a) Referral from Government Dental — First visit', charge: 'RM 60' },
          { name: 'a) Referral from Government Dental — Follow-up visit', charge: 'RM 20' },
          { name: 'b) Referral from private / Government Dental or Medical Officer — First visit', charge: 'RM 60' },
          { name: 'b) Referral from private / Government Dental or Medical Officer — Follow-up visit', charge: 'RM 20' },
          { name: 'c) Follow-up cases discharged from ward for each visit', charge: 'RM 20' },
        ],
      },
      {
        id: 'fc-treatment-types',
        title: 'Type of Treatment',
        items: [
          { name: 'Extraction Permanent tooth', charge: 'RM 50' },
          { name: 'Extraction Deciduous (Desidus) tooth', charge: 'RM 25' },
          { name: 'Extraction - Complication', charge: 'RM 50' },
          { name: 'Restoration permanent tooth - single surface', charge: 'RM 75' },
          { name: 'Restoration - deciduous tooth', charge: 'RM 30' },
          { name: 'Scaling and polishing per arch', charge: 'RM 214' },
          { name: 'Soft splint', charge: 'RM 50' },
          {
            name: 'Crown / veneer - per unit',
            charge: 'RM 200',
            note: 'Inclusive of temporary crown; excluding material and laboratory charges',
          },
          { name: 'Root canal treatment - premolar', charge: 'RM 200' },
          { name: 'Pulpectomy - per tooth', charge: 'RM 200' },
          { name: 'Tooth bleaching (external) per arch', charge: 'RM 500' },
          { name: 'Reimplantation of tooth', charge: 'RM 200' },
        ],
      },
      {
        id: 'fc-tcm',
        title: 'Traditional and Complementary Medicine Services',
        items: [
          { name: 'Chronic disease treatment', charge: 'RM 50 per session' },
          { name: 'Post natal massage treatment', charge: 'RM 50 per session' },
          { name: 'Shirodhara', charge: 'RM 150 per session' },
          { name: 'Kiropraktik', charge: 'RM 150 per session' },
        ],
      },
      {
        id: 'fc-radiotherapy',
        title: 'iv) Radiotherapy charges (Schedule FC reference)',
        items: [
          { name: 'Radical Radiotherapy', charge: 'RM 3,000' },
          { name: 'Brachytherapy (High dose rate)', charge: 'RM 3,000' },
          { name: 'Brachytherapy (Low dose rate)', charge: 'RM 2,000' },
        ],
      },
    ],
  },
  {
    id: 'CARDIO',
    code: 'Cardiothoracic',
    titleEn: 'Cardiology & Cardiothoracic Charges',
    titleBm: 'Caj Kardiologi & Kardiotorasik',
    groups: [
      {
        id: 'cardio-closed',
        title: 'Cardiothoracic Surgeries — Closed Heart',
        items: [
          {
            name: 'Duct, Simple (Patent Ductus Arteriosus, Blalock Taussig, shunt)',
            charge: 'RM 7,500',
          },
          { name: 'Complex', charge: 'RM 10,000' },
        ],
      },
      {
        id: 'cardio-open',
        title: 'Cardiothoracic Surgeries — Open Heart',
        items: [
          { name: 'Coronary Artery Bypass Graft', charge: 'RM 15,000' },
          { name: 'Complex', charge: 'RM 10,000' },
        ],
      },
      {
        id: 'cardio-valve',
        title: 'Valve Replacement, Repair & Aortic / Thoracic Surgery',
        items: [
          { name: 'Valve replacement — One valve', charge: 'RM 15,500' },
          { name: 'Valve replacement — Two valve', charge: 'RM 23,000' },
          { name: 'Valve replacement — Three valve', charge: 'RM 24,000' },
          { name: 'Valve repair', charge: 'RM 12,000' },
          { name: 'Aortic Root Surgery — without valve', charge: 'RM 17,500' },
          { name: 'Aortic Root Surgery — with valve', charge: 'RM 21,000' },
          { name: 'Thoracic surgery', charge: 'RM 8,000' },
        ],
      },
    ],
  },
];
