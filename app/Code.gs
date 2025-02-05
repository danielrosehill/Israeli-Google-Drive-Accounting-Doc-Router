// Month names mapping
const MONTHS = [
  '01_Jan', '02_Feb', '03_Mar', '04_Apr', '05_May', '06_Jun',
  '07_Jul', '08_Aug', '09_Sep', '10_Oct', '11_Nov', '12_Dec'
];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Accounting File Router')
    .setFaviconUrl('https://www.google.com/images/drive/drive-48.png');
}

/**
 * Process uploaded files and route them to the appropriate folder
 * @param {Object[]} files - Array of file blobs
 * @param {string} folderType - Type of folder (EXPENSE, INVOICES, RECEIPTS)
 * @returns {Object} Processing result
 */
/**
 * Create folder structure for selected folder types
 * @param {string[]} folderTypes - Array of folder types to create structure for
 * @returns {Object} Creation result
 */
function createFolderStructure(folderTypes) {
  try {
    const config = JSON.parse(PropertiesService.getUserProperties().getProperty('accountingRouterConfig') || '{}');
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = MONTHS[now.getMonth()];
    let created = 0;
    
    folderTypes.forEach(folderType => {
      const folderId = config[folderType];
      if (!folderId) {
        throw new Error(`Folder ID not configured for ${folderType}`);
      }
      
      // Get or create the folder structure
      const rootFolder = DriveApp.getFolderById(folderId);
      const yearFolder = findOrCreateFolder(rootFolder, year);
      const monthFolder = findOrCreateFolder(yearFolder, month);
      findOrCreateFolder(monthFolder, 'Israeli'); // Create Israeli subfolder
      created++;
    });
    
    return {
      success: true,
      message: `Successfully created folder structure for ${created} folder type(s)`
    };
  } catch (error) {
    return {
      success: false,
      message: `Error creating folder structure: ${error.toString()}`
    };
  }
}

function processFiles(files, folderType, monthOverride) {
  try {
    // Get folder ID from the client-side configuration
    const config = JSON.parse(PropertiesService.getUserProperties().getProperty('accountingRouterConfig') || '{}');
    const folderId = config[folderType];
    
    if (!folderId) {
      throw new Error('Folder ID not configured for ' + folderType);
    }

    // Get the target date (either from override or current)
    let year, month;
    if (monthOverride) {
      const [targetYear, targetMonth] = monthOverride.split('-');
      year = targetYear;
      month = MONTHS[parseInt(targetMonth) - 1];
    } else {
      const now = new Date();
      year = now.getFullYear().toString();
      month = MONTHS[now.getMonth()];
    }
    
    // Get the root folder based on type
    const rootFolder = DriveApp.getFolderById(folderId);
    
    // Find or create year folder
    let yearFolder = findOrCreateFolder(rootFolder, year);
    
    // Find or create month folder
    let monthFolder = findOrCreateFolder(yearFolder, month);
    
    // Process each file
    const results = [];
    files.forEach(file => {
      let targetFolder = monthFolder;
      
      // If file is marked as Israeli, create/get Israeli subfolder
      if (file.isIsraeli) {
        targetFolder = findOrCreateFolder(monthFolder, 'Israeli');
      }
      
      const blob = Utilities.newBlob(
        Utilities.base64Decode(file.bytes),
        file.mimeType,
        file.fileName
      );
      const newFile = targetFolder.createFile(blob);
      results.push({
        name: file.fileName,
        success: true,
        url: newFile.getUrl()
      });
    });
    
    return {
      success: true,
      message: `Successfully processed ${files.length} file(s)`,
      results: results
    };
  } catch (error) {
    return {
      success: false,
      message: `Error processing files: ${error.toString()}`,
      results: []
    };
  }
}

/**
 * Get saved configuration from user properties
 * @returns {Object} Configuration object with folder IDs
 */
function getConfiguration() {
  try {
    const config = PropertiesService.getUserProperties().getProperty('accountingRouterConfig');
    return config ? JSON.parse(config) : null;
  } catch (error) {
    console.error('Failed to get configuration:', error);
    return null;
  }
}

/**
 * Find a folder by name or create it if it doesn't exist
 * @param {GoogleAppsScript.Drive.Folder} parentFolder - Parent folder
 * @param {string} folderName - Name of folder to find/create
 * @returns {GoogleAppsScript.Drive.Folder} The found or created folder
 */

/**
 * Save configuration to user properties
 * @param {Object} config - Configuration object with folder IDs
 * @returns {Object} Save result
 */
function saveConfiguration(config) {
  try {
    PropertiesService.getUserProperties().setProperty('accountingRouterConfig', JSON.stringify(config));
    return { success: true };
  } catch (error) {
    throw new Error('Failed to save configuration: ' + error.toString());
  }
}

function findOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}
