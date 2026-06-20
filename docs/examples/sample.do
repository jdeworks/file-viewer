use "survey_data.dta", clear
keep if age >= 18
gen log_income = log(income)
replace log_income = 0 if missing(log_income)
summarize income age education
reg log_income age education gender
drop if year < 2010
merge 1:1 id using "controls.dta"
tabulate region gender
