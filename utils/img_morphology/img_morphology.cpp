#include "stdafx.h"

#include "opencv2/imgproc/imgproc.hpp"
#include "opencv2/highgui/highgui.hpp"
#include "opencv/highgui.h"
#include <stdlib.h>
#include <stdio.h>
#include <iostream>

using namespace cv;
using namespace std;

int main(int argc, char** argv)
{
	if (argc != 6)
	{
		cout << " Usage: img_morphology.exe <size> <shape> <type> <input> <output>" << endl;
		cout << "  size: 1, 2.. in pixels" << endl;
		cout << " shape: MORPH_RECT = 0, MORPH_CROSS = 1, MORPH_ELLIPSE = 2" << endl;
		cout << "  type: dilate = 0, erode = 1" << endl;
		return -1;
	}

	try {
		int size = atoi(argv[1]);
		int shape = atoi(argv[2]);
		int type = atoi(argv[3]);

		Mat image = imread(argv[4], IMREAD_COLOR); // Read the file
		if (image.empty()) // Check for invalid input
		{
			cout << "Could not open or find the image" << std::endl;
			return 2;
		}

		if (!image.data)
		{
			cout << "Could not read the image" << std::endl;
			return 3;
		}

		int erosion_size = size;

		Mat element = getStructuringElement(shape, // MORPH_ELLIPSE,
			Size(2 * erosion_size + 1, 2 * erosion_size + 1),
			Point(erosion_size, erosion_size));

		Mat erosion_dst;

		if (type == 0) {
			dilate(image, erosion_dst, element);
		}
		else {
			erode(image, erosion_dst, element);
		}

		imwrite(argv[5], erosion_dst);

		return 0;
	}
	catch (const std::exception& e) {
		cout << e.what() << std::endl;
		return 1;
	}
}
