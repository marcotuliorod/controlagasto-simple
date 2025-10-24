#!/usr/bin/env node

/**
 * Lighthouse CI automation script
 * Runs Lighthouse audits and validates quality thresholds
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'artifacts/lighthouse';
const MIN_SCORES = {
  performance: 90,
  accessibility: 95,
  'best-practices': 90,
  seo: 90,
  pwa: 80,
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function runLighthouse() {
  console.log('🔍 Running Lighthouse CI...\n');
  
  ensureDir(ARTIFACTS_DIR);

  try {
    // Run Lighthouse CI
    execSync('npx @lhci/cli@0.14.x autorun', {
      stdio: 'inherit',
      env: {
        ...process.env,
        LHCI_BUILD_CONTEXT__CURRENT_BRANCH: process.env.GITHUB_REF_NAME || 'local',
      },
    });

    console.log('\n✅ Lighthouse CI completed successfully');
    return true;
  } catch (error) {
    console.error('\n❌ Lighthouse CI failed:', error.message);
    return false;
  }
}

function analyzeResults() {
  console.log('\n📊 Analyzing Lighthouse results...\n');

  const resultsDir = '.lighthouseci';
  if (!fs.existsSync(resultsDir)) {
    console.log('⚠️ No Lighthouse results found');
    return true;
  }

  // Find manifest file
  const manifestPath = path.join(resultsDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.log('⚠️ No manifest.json found');
    return true;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  let allPassed = true;

  manifest.forEach((entry, index) => {
    console.log(`\n📄 URL ${index + 1}: ${entry.url}`);
    
    const reportPath = path.join(resultsDir, entry.jsonPath);
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    
    const categories = report.categories;
    
    Object.entries(MIN_SCORES).forEach(([category, minScore]) => {
      const score = Math.round(categories[category]?.score * 100);
      const passed = score >= minScore;
      const icon = passed ? '✅' : '❌';
      
      console.log(`  ${icon} ${category}: ${score}/100 (min: ${minScore})`);
      
      if (!passed) {
        allPassed = false;
      }
    });
  });

  console.log('\n' + '='.repeat(60));
  
  if (allPassed) {
    console.log('✅ All Lighthouse audits passed!\n');
  } else {
    console.log('❌ Some Lighthouse audits failed. Review the details above.\n');
  }

  // Copy results to artifacts
  try {
    execSync(`cp -r ${resultsDir}/* ${ARTIFACTS_DIR}/`, { stdio: 'inherit' });
    console.log(`📦 Results saved to ${ARTIFACTS_DIR}/\n`);
  } catch (error) {
    console.log('⚠️ Could not copy results to artifacts');
  }

  return allPassed;
}

// Main execution
const success = runLighthouse();
const passed = success && analyzeResults();

process.exit(passed ? 0 : 1);
