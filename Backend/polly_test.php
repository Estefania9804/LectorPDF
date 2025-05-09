<?php
require 'vendor/autoload.php';

use Aws\Polly\PollyClient;
use Aws\Exception\AwsException;

// Asegúrate de que la ruta sea correcta para acceder al archivo fuera del directorio público
$config = require '/home/u577579136/domains/textoavozparapdfs.org/config.php'; 

$region = $config['aws_region'] ?? 'us-east-2';
$awsAccessKeyId = $config['aws_access_key_id'] ?? '';
$awsSecretAccessKey = $config['aws_secret_access_key'] ?? '';
$voiceId = 'Enrique';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $json_data = file_get_contents("php://input");
    $data = json_decode($json_data, true);
    $textToSynthesize = isset($data['textToRead']) ? trim($data['textToRead']) : '';

    if (!empty($textToSynthesize)) {
        if (empty($awsAccessKeyId) || empty($awsSecretAccessKey)) {
            http_response_code(500);
            echo json_encode(['error' => 'Las credenciales de AWS no están configuradas en el archivo de configuración.']);
            exit();
        }

        try {
            $pollyClient = new PollyClient([
                'version' => 'latest',
                'region'  => $region,
                'credentials' => [
                    'key'    => $awsAccessKeyId,
                    'secret' => $awsSecretAccessKey,
                ],
            ]);

            $result = $pollyClient->synthesizeSpeech([
                'Text'         => $textToSynthesize,
                'VoiceId'      => $voiceId,
                'OutputFormat' => 'mp3',
            ]);

            if ($result['AudioStream']) {
                header('Content-Type: audio/mpeg');
                echo $result['AudioStream']->getContents();
                exit();
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'No se recibió audio de la API de Polly.']);
                exit();
            }

        } catch (AwsException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error al sintetizar voz: ' . $e->getMessage()]);
            exit();
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'No se proporcionó texto para sintetizar.']);
        exit();
    }
} else {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['error' => 'Método no permitido. Solo se aceptan solicitudes POST.']);
    exit();
}
?>