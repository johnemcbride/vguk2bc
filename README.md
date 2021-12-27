# vguk2bc

Utility For Downloading Vanguard Statement &amp; Converting To BeanCount Format

## Pre-Requisites

You have installed node and a git client

## Quick Start

```
git clone  git@github.com:johnemcbride/vguk2bc.git
cd vguk2bc
node src/main.js
```

You will be prompted for Vanguard UK username and password.

A headless Chrome instance will launch and cause a Transaction Report to be downloaded.

This will then be processed and turned into a beancount file ("beancount.txt") for loading into **ledger.**

Look in the "executions" folder for logs and the downloaded Transaction Report.


### Already Have An Existing Vanguard Transaction Report (or want to download manually)

```
node src/main.js --file <location of the excel report>
```
This will produce the file "beancount.txt" in the local directory without attempting to log in to Vanguard.