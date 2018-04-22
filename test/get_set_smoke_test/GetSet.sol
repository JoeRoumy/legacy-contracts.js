contract GetSet {

	uint uintfield;
	bytes32 bytesfield;
	string stringfield;
	bool boolfield;

	function testExist() constant returns (uint output){
		return 1;
	}

	function setUint(uint input){
		uintfield = input;
		return;
	}

	function getUint() constant returns (uint output){
		output = uintfield;
		return;
	}

	function setBytes(bytes32 input){
		bytesfield = input;
		return;
	}

	function getBytes() constant returns (bytes32 output){
		output = bytesfield;
		return;
	}

	function setString(string input){
		stringfield = input;
		return;
	}

	function getString() constant returns (string output){
		output = stringfield;
		return;
	}

	function setBool(bool input){
		boolfield = input;
		return;
	}

	function getBool() constant returns (bool output){
		output = boolfield;
		return;
	}

}