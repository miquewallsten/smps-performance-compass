<?php
/**
 * Deploy Webhook for Hostinger
 * Triggered by GitHub Actions after pushing built artifacts.
 * Runs git pull + build-and-restart.sh on the server.
 */

$secret = 'smps-deploy-webhook-2025';
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';

if (empty($signature)) {
    http_response_code(401);
    echo json_encode(['error' => 'Missing signature']);
    exit;
}

$expectedSig = 'sha256=' . hash_hmac('sha256', $payload, $secret);

if (!hash_equals($expectedSig, $signature)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

// Run deployment in background
$appDir = '/home/u906489923/domains/bowdot.online/smps-app';
$cmd = "cd $appDir && git pull origin main 2>&1 && bash build-and-restart.sh 2>&1";

// Execute asynchronously
$descriptors = [
    0 => ['pipe', 'r'],
    1 => ['pipe', 'w'],
    2 => ['pipe', 'w'],
];
$process = proc_open("nohup $cmd >> $appDir/console.log 2>&1 &", $descriptors, $pipes);
if (is_resource($process)) {
    fclose($pipes[0]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    proc_close($process);
}

http_response_code(200);
echo json_encode(['status' => 'deploy_started', 'message' => 'Git pull and restart initiated']);
