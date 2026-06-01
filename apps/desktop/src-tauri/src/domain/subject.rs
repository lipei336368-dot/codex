use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct Subject {
    pub id: &'static str,
    pub name: &'static str,
    pub theme_key: &'static str,
}

pub const SUBJECTS: [Subject; 4] = [
    Subject {
        id: "pharmaceutics",
        name: "药剂学",
        theme_key: "pharmaceutics",
    },
    Subject {
        id: "pharmacology",
        name: "药理学",
        theme_key: "pharmacology",
    },
    Subject {
        id: "medicinal_chemistry",
        name: "药物化学",
        theme_key: "medicinalChemistry",
    },
    Subject {
        id: "pharmaceutical_analysis",
        name: "药物分析",
        theme_key: "pharmaceuticalAnalysis",
    },
];
