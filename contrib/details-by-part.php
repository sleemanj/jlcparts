<?php
/**
 * details-by-part.php
 *
 * This script fetches component information from the JLCPCB API
 * based on a part number provided in the URL query string.
 *
 * Usage example:
 * http://your-server.com/details-by-part.php?partNumber=C10002
 *
 * It acts as a server-side proxy to bypass potential CORS issues
 * and provides a simple way to get component data.
 */

  function cors() {
    
    // Allow from any origin
    if (isset($_SERVER['HTTP_ORIGIN'])) {
        // Decide if the origin in $_SERVER['HTTP_ORIGIN'] is one
        // you want to allow, and if so:
        header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400');    // cache for 1 day
    }
    
    // Access-Control headers are received during OPTIONS requests
    if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
        
        if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
            // may also be using PUT, PATCH, HEAD etc
            header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
        
        if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
            header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    
        exit(0);
    }
    
   //  echo "You have CORS!";
  }

  cors();

  // Check if the 'partNumber' query string parameter is set.
  if (!isset($_GET['partNumber'])) 
  {
      http_response_code(400); // Bad Request
      echo json_encode(['error' => 'The "partNumber" query string parameter is required.']);
      exit;
  }

  function search_for_part($partNumber)
  {
    // Which of these searches that the part number shows up in, is indeterminate!    
    foreach(['stock','buy','post', ''] as $presaleType)
    {
      // Define the API endpoint URL.
      $url = 'https://jlcpcb.com/api/overseas-pcb-order/v1/shoppingCart/smtGood/selectSmtComponentList/v2';

      // Define the request headers as an array.
      $headers = [
          'authority: jlcpcb.com',
          'accept: application/json, text/plain, */*',
          'accept-language: en-US,en;q=0.9',
          'cache-control: no-cache',
          'content-type: application/json',
          'origin: https://jlcpcb.com',
          'pragma: no-cache',
          'referer: https://jlcpcb.com/parts',
          'sec-ch-ua: "Chromium";v="104", " Not A;Brand";v="99", "Google Chrome";v="104"',
          'sec-ch-ua-mobile: ?0',
          'sec-ch-ua-platform: "Linux"',
          'sec-fetch-dest: empty',
          'sec-fetch-mode: cors',
          'sec-fetch-site: same-origin',
          'user-agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
      ];

      // Create the JSON payload for the POST request.
      $postData = [
          'componentLibraryType' => null,
          'currentPage' => 1,
          'firstSortName' => null,
          'keyword' => $partNumber, // Insert the part number here.
          'pageSize' => 25,
          'presaleType' => $presaleType,
          'searchType' => 2,
          'secondSortName' => null,
          'stockFlag' => null,
          'stockSort' => null,
      ];

      // Encode the payload into a JSON string.
      $jsonPostData = json_encode($postData);


      // Initialize cURL session.
      $curl = curl_init();

      // Set the cURL options.
      curl_setopt_array($curl, [
          CURLOPT_URL => $url,
          CURLOPT_RETURNTRANSFER => true, // Return the response as a string instead of echoing it.
          CURLOPT_POST => true,           // Set the request method to POST.
          CURLOPT_POSTFIELDS => $jsonPostData, // Set the POST data.
          CURLOPT_HTTPHEADER => $headers, // Set the request headers.
          CURLOPT_ENCODING => '', // Handles all encodings.
          CURLOPT_MAXREDIRS => 10,
          CURLOPT_TIMEOUT => 30,
          CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
          CURLOPT_CUSTOMREQUEST => 'POST'
      ]);

      // Execute the cURL request.
      $response = curl_exec($curl);
      

      // Check for errors.
      if (curl_errno($curl)) {
        curl_close($curl);
          return ['code' => 500, 'error' => 'cURL error: ' . curl_error($curl)];
      } else {
        curl_close($curl);
        // Search through the results to see if the part number is in there
        $r = json_decode($response, TRUE);
        
        if($r['code'] !== 200) 
        {
          if(!$r['error']) $r['error'] = 'Unknown Error from JLC';
          return $r;
        }
        
        if(@$r['data']['componentPageInfo']['total']>=1)
        {
          foreach($r['data']['componentPageInfo']['list'] as $component)
          {
            if($component['componentCode'] === $partNumber)
            {
              // Found
              return $component;
            }
          }
        }
      }
    }
      
    return ['code' => 404, 'error' => 'Not Found'];
  }

  function get_pricing_data($componentLcscId)
  {
    // Define the API endpoint URL.
    $url = 'https://jlcpcb.com/api/overseas-pcb-order/v1/shoppingCart/smtGood/getComponentDetail?componentLcscId='.$componentLcscId;

    // Define the request headers as an array.
    $headers = [
        'authority: jlcpcb.com',
        'accept: application/json, text/plain, */*',
        'accept-language: en-US,en;q=0.9',
        'cache-control: no-cache',
        'content-type: application/json',
        'origin: https://jlcpcb.com',
        'pragma: no-cache',
        'referer: https://jlcpcb.com/parts',
        'sec-ch-ua: "Chromium";v="104", " Not A;Brand";v="99", "Google Chrome";v="104"',
        'sec-ch-ua-mobile: ?0',
        'sec-ch-ua-platform: "Linux"',
        'sec-fetch-dest: empty',
        'sec-fetch-mode: cors',
        'sec-fetch-site: same-origin',
        'user-agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    ];

    // Initialize cURL session.
    $curl = curl_init();

    // Set the cURL options.
    curl_setopt_array($curl, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true, // Return the response as a string instead of echoing it.
        CURLOPT_HTTPHEADER => $headers, // Set the request headers.
        CURLOPT_ENCODING => '', // Handles all encodings.
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    ]);

    // Execute the cURL request.
    $response = curl_exec($curl);

    // Check for errors.
    if (curl_errno($curl)) {
        curl_close($curl);
        return ['code' => 500, 'error' => 'cURL error: ' . curl_error($curl)];
    } else {
        $r = json_decode($response, true);
        if($r['code'] !== 200) 
        {
          if(!$r['error']) $r['error'] = 'Unknown Error from JLC';
          return $r;
        }
        
        return $r['data'];
        
    }
    
    return ['code' => 404, 'error' => 'Pricing data not found'];
  }
  
  
  header('Content-Type: application/json');
  
  $component = search_for_part($_GET['partNumber']);
  if(@$component['error'])
  {
    http_response_code($component['code']); // Internal Server Error
    echo json_encode($component);
    return;
  }
  
  $pricing = get_pricing_data($component['componentId']);
  if(@$pricing['error'])
  {
    http_response_code($pricing['code']); // Internal Server Error
    echo json_encode($component);
    return;
  }
  
  echo json_encode([ 'code' => 200, 'errpr' => null, 'data' => array_merge($component,$pricing) ], JSON_PRETTY_PRINT);
?>

