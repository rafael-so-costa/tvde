export interface OnboardingHelpItem{
    id:string;
    title:string;
    slug:string;
    type:"article"|"video";
    type_label:string;
    url:string;
}

export interface OnboardingStep{
    key:
        |"company"
        |"owner"
        |"vehicle"
        |"driver"
        |"contract"
        |"employee"
        |"notifications"
        |"help_center";

    title:string;
    description:string;
    feature_key:string;
    action_url:string;
    action_label:string;
    optional:boolean;
    completed:boolean;
    help:OnboardingHelpItem[];
}

export interface OnboardingProgress{
    progress:number;
    completed:number;
    total:number;
    core_progress:number;
    core_completed:number;
    core_total:number;
    base_ready:boolean;
    fully_complete:boolean;
    steps:OnboardingStep[];
}
