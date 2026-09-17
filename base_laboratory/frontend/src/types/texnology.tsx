export type Department = {
    id: number;
    name: string;
    boss_fullName: string;
}

export type Section = {
    id: number;
    department: number;
    name: string;
   
}

export type GenericType = {
    id: number;
    name: string;
}


export type LicenseType = {
    id: string;
    begin_date: string;
    finish_date: string;
    license_pdf: string
}


export type ProgramType = {
    id: number;
    license_data: LicenseType
    license_type: string;
    title: string;
    type: string;
    version: string;
}

export interface TexnologyDataStructure {
    departament: Department[];
    section: Section[];
    warehouse_manager: GenericType[];
    type_compyuter: GenericType[];
    motherboard: GenericType[];
    motherboard_model: GenericType[];
    cpu: GenericType[];
    generation: GenericType[];
    frequency: GenericType[];
    hdd: GenericType[];
    ssd: GenericType[];
    disk_type: GenericType[];
    ram_type: GenericType[];
    ram_size: GenericType[];
    gpu: GenericType[];
    printer: GenericType[];
    scaner: GenericType[];
    mfo: GenericType[];
    type_webcamera: GenericType[];
    model_webcam: GenericType[];
    type_monitor: GenericType[];
    program_with_license_and_systemic: ProgramType[];
    program_with_license_and_additional: ProgramType[];
    program_with_no_license_and_systemic: ProgramType[];
    program_with_no_license_and_additional: ProgramType[];

}


